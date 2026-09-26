import type {
  Claim,
  CommunityReview,
  CommunityReviewStance,
  Correction,
  DeleteReason,
  EvidenceRecord,
  IntakeStatus,
  ReviewConfidence,
  RiskFlag,
  RiskLevel,
} from "@/lib/types";

const EMPTY_CLAIMS: Claim[] = [];

function hasStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function legacyAutomationStatus(value: unknown): Claim["automationStatus"] {
  switch (value) {
    case "pending":
    case "queued":
    case "not_started":
      return "queued";
    case "processing":
    case "running":
      return "running";
    case "complete":
    case "completed":
      return "completed";
    case "partially_completed":
      return "partially_completed";
    case "failed":
      return "failed";
    default:
      return "queued";
  }
}

function normalizeIntakeStatus(claim: Claim): IntakeStatus {
  if (claim.intakeStatus) return claim.intakeStatus;
  if (claim.automationStatus === "completed") return "ready_for_review";
  if (claim.automationStatus === "partially_completed") return "needs_more_context";
  if (claim.automationStatus === "failed") return "failed";
  if (claim.automationStatus === "running") return "checking";
  return "submitted";
}

function migrateClaim(raw: Partial<Claim> & { id: string }): Claim {
  const claim = raw as Claim;
  const now = new Date().toISOString();
  const submittedAt = claim.submittedAt || now;
  const updatedAt = claim.updatedAt || submittedAt;
  const body = claim.body || (claim as unknown as { text?: string }).text || "";
  const title =
    claim.title ||
    (body.length > 120 ? `${body.slice(0, 117)}…` : body) ||
    "Untitled Claim";
  const automationStatus = legacyAutomationStatus(claim.automationStatus);
  const intakeStatus = normalizeIntakeStatus({
    ...claim,
    automationStatus,
  } as Claim);
  const publishedReview = claim.publishedReview
    ? {
        ...claim.publishedReview,
        claimInterpretation: claim.publishedReview.claimInterpretation ?? "",
        supportingAnalysis: claim.publishedReview.supportingAnalysis ?? "",
        contradictingAnalysis:
          claim.publishedReview.contradictingAnalysis ?? "",
        contextAnalysis: claim.publishedReview.contextAnalysis ?? "",
        evidenceStrength:
          claim.publishedReview.evidenceStrength ?? ("moderate" as const),
        confidence: claim.publishedReview.confidence ?? ("medium" as const),
        qualityChecklist: claim.publishedReview.qualityChecklist ?? {
          dateChecked: true,
          locationChecked: true,
          scopeChecked: true,
        },
        qualityCheckPassed:
          claim.publishedReview.qualityCheckPassed !== false,
      }
    : null;
  return {
    ...claim,
    title,
    body,
    submittedAt,
    updatedAt,
    category: claim.category || "other",
    claimStatus: claim.claimStatus || "unverified",
    riskLevel: claim.riskLevel || "low",
    automationStatus,
    intakeStatus,
    publishedReview,
    intakeChecks: Array.isArray(claim.intakeChecks) ? claim.intakeChecks : [],
    corrections: Array.isArray(claim.corrections) ? claim.corrections : [],
    versions: Array.isArray(claim.versions) ? claim.versions : [],
    isVisibleInUnderReview: claim.isVisibleInUnderReview !== false,
    isVisibleInReviewedFeed: claim.isVisibleInReviewedFeed !== false,
    sameClaimCount: typeof claim.sameClaimCount === "number" ? claim.sameClaimCount : 0,
    sameClaimVoterIds: Array.isArray(claim.sameClaimVoterIds)
      ? claim.sameClaimVoterIds
      : [],
    isDeleted: claim.isDeleted === true,
    deletedAt: claim.deletedAt ?? null,
    deletedReason: claim.deletedReason ?? null,
    deletedReasonDetail: claim.deletedReasonDetail ?? null,
    deletedBy: claim.deletedBy ?? null,
    versionNumber: claim.versionNumber ?? 1,
    evidence: Array.isArray(claim.evidence) ? claim.evidence : [],
    riskFlags: Array.isArray(claim.riskFlags) ? claim.riskFlags : [],
    reviewHistory: Array.isArray(claim.reviewHistory) ? claim.reviewHistory : [],
    communityReviews: Array.isArray(claim.communityReviews)
      ? claim.communityReviews.filter(
          (review) =>
            review &&
            typeof review.id === "string" &&
            typeof review.note === "string"
        )
      : [],
  };
}

let cache: Claim[] | null = null;
let bootstrapPromise: Promise<void> | null = null;
let refreshPromise: Promise<void> | null = null;

/**
 * Shared feed status so the UI can render honest loading, error, and empty
 * states instead of flashing "No claims yet" while the shared store loads.
 */
export type SharedFeedStatus = "loading" | "ready" | "error";
let sharedFeedStatus: SharedFeedStatus = "loading";
const statusListeners = new Set<(status: SharedFeedStatus) => void>();

export function getSharedFeedStatus(): SharedFeedStatus {
  return sharedFeedStatus;
}

export function subscribeSharedFeedStatus(
  listener: (status: SharedFeedStatus) => void
): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

function setSharedFeedStatus(next: SharedFeedStatus): void {
  if (sharedFeedStatus === next) return;
  sharedFeedStatus = next;
  for (const listener of statusListeners) listener(next);
}

export function hydrateClaims(claims: Claim[]): void {
  const normalized = claims
    .filter((claim) => claim && typeof claim.id === "string")
    .map((claim) => migrateClaim(claim))
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
  cache = normalized;
  notify(normalized);
  setSharedFeedStatus("ready");
}

async function syncClaimToServer(claim: Claim): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(claim),
      cache: "no-store",
    });
    await refreshSharedClaims();
  } catch {
    // The next scheduled refresh will reconcile the memory cache.
  }
}

async function fetchSharedClaims(): Promise<Claim[] | null> {
  try {
    const response = await fetch("/api/claims", { cache: "no-store" });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return null;
    return data as Claim[];
  } catch {
    return null;
  }
}

/** Load the canonical claims list from Supabase through the server API. */
export function bootstrapSharedClaims(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;
  if (sharedFeedStatus !== "ready") setSharedFeedStatus("loading");
  bootstrapPromise = (async () => {
    const server = await fetchSharedClaims();
    if (server) {
      hydrateClaims(server);
    } else if (sharedFeedStatus !== "ready") {
      setSharedFeedStatus("error");
    }
  })().finally(() => {
    bootstrapPromise = null;
  });
  return bootstrapPromise;
}

/** Pull the latest shared claims (other browsers / users). */
export function refreshSharedClaims(): Promise<void> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const server = await fetchSharedClaims();
    if (server) {
      hydrateClaims(server);
    } else if (sharedFeedStatus !== "ready") {
      setSharedFeedStatus("error");
    }
  })()
    .catch(() => {
      if (sharedFeedStatus !== "ready") setSharedFeedStatus("error");
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

function readAll(): Claim[] {
  return cache ?? EMPTY_CLAIMS;
}

type Listener = (claims: Claim[]) => void;
const listeners = new Set<Listener>();

function notify(claims: Claim[]): void {
  cache = claims;
  for (const listener of listeners) listener(claims);
}

export function subscribeClaims(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function listClaims(): Claim[] {
  return readAll();
}

export function getStoredClaim(id: string): Claim | undefined {
  return readAll().find((claim) => claim.id === id);
}

export function saveClaim(claim: Claim): Claim {
  const claims = [...readAll()];
  const index = claims.findIndex((c) => c.id === claim.id);
  if (index >= 0) {
    claims[index] = claim;
  } else {
    claims.unshift(claim);
  }
  claims.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  cache = claims;
  notify(claims);
  void syncClaimToServer(claim);
  return claim;
}

export function updateClaim(
  id: string,
  patch: Partial<Claim>
): Claim | undefined {
  const claims = [...readAll()];
  const index = claims.findIndex((c) => c.id === id);
  if (index < 0) return undefined;
  // Prevent editing the original claim body or title (AGENTS.md: "Preserve original claim text").
  const safePatch = { ...patch } as Partial<Claim> & { body?: string; title?: string };
  delete safePatch.body;
  delete safePatch.title;
  const next: Claim = {
    ...claims[index],
    ...safePatch,
    updatedAt: safePatch.updatedAt ?? new Date().toISOString(),
  };
  claims[index] = next;
  claims.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  cache = claims;
  notify(claims);
  void syncClaimToServer(next);
  return next;
}

export interface DeleteClaimOptions {
  reason: DeleteReason;
  reasonDetail?: string;
}

/**
 * Soft-deletes a claim (DP3): removes it from public feeds while keeping the
 * record for audit. Published claims cannot be deleted. Original text is never
 * edited. Authentication is intentionally disabled — this is a public demo delete.
 */
export function deleteClaim(
  id: string,
  options?: DeleteClaimOptions
): boolean {
  const claim = getStoredClaim(id);
  if (!claim) return false;
  if (claim.isDeleted) return true;
  if (claim.publishedReview) return false;
  if (
    claim.claimStatus === "verified_true" ||
    claim.claimStatus === "verified_false" ||
    claim.claimStatus === "misleading"
  ) {
    return false;
  }

  const now = new Date().toISOString();
  const reason = options?.reason ?? "other";
  const reasonDetail = (options?.reasonDetail ?? "").trim();
  const note =
    reason === "other" && reasonDetail
      ? `Public demo delete — reason: other (${reasonDetail}).`
      : `Public demo delete — reason: ${reason.replace(/_/g, " ")}.`;

  const next = updateClaim(id, {
    isDeleted: true,
    deletedAt: now,
    deletedReason: reason,
    deletedReasonDetail: reasonDetail || null,
    deletedBy: "Public demo delete",
    isVisibleInUnderReview: false,
    isVisibleInReviewedFeed: false,
    reviewHistory: [
      ...claim.reviewHistory,
      {
        id: `rev-del-${Date.now().toString(36)}`,
        action: "deleted",
        author: "Public demo delete",
        note,
        createdAt: now,
      },
    ],
  });
  return Boolean(next);
}



export interface CreateClaimInput {
  claimText: string;
  category: Claim["category"];
  sourceUrl: string | null;
  riskFlags: RiskFlag[];
  riskLevel: RiskLevel;
  platform?: string | null;
  idempotencyKey?: string;
}

export function createClaim(input: CreateClaimInput): Claim {
  const now = new Date().toISOString();
  const trimmed = input.claimText.trim();
  const title =
    trimmed.length > 120 ? `${trimmed.slice(0, 117).trimEnd()}…` : trimmed;
  const claim: Claim = {
    id: `clm-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    title,
    body: trimmed,
    category: input.category,
    platform: input.platform ?? null,
    sourceUrl: input.sourceUrl,
    claimStatus: "unverified",
    lifecycleState: "submitted",
    intakeStatus: "submitted",
    automationStatus: "queued",
    automatedEvidenceCount: 0,
    riskLevel: input.riskLevel,
    riskFlags: input.riskFlags,
    evidence: [],
    intakeChecks: [],
    corrections: [],
    versions: [],
    intakeCompletedAt: null,
    intakeError: null,
    isVisibleInUnderReview: true,
    // New unverified claims are NOT visible in the Reviewed feed.
    // isVisibleInReviewedFeed is only flipped to true when a reviewer publishes
    // a verdict and marks quality checks as passed.
    isVisibleInReviewedFeed: false,
    sameClaimCount: 0,
    sameClaimVoterIds: [],
    isDeleted: false,
    deletedAt: null,
    deletedReason: null,
    deletedReasonDetail: null,
    deletedBy: null,
    submittedSessionId: getSessionId(),
    isSeed: false,
    versionNumber: 1,
    submittedAt: now,
    updatedAt: now,
    reviewHistory: [
      {
        id: `rev-${Date.now().toString(36)}-submit`,
        action: "submitted",
        author: "Public submission",
        note: "Claim received through the public submission form.",
        createdAt: now,
      },
    ],
    humanReview: null,
    publishedReview: null,
    communityReviews: [],
    idempotencyKey: input.idempotencyKey,
    normalizedFingerprint: trimmed.toLowerCase().replace(/\s+/g, " "),
    submitterDeletionToken: crypto.randomUUID().replaceAll("-", ""),
  };
  return claim;
}

export function setEvidence(
  claimId: string,
  evidence: EvidenceRecord[],
  automationStatus: Claim["automationStatus"],
  extra?: Partial<Claim>
): Claim | undefined {
  return updateClaim(claimId, {
    evidence,
    automatedEvidenceCount: evidence.length,
    automationStatus,
    ...extra,
  });
}

export function addCorrection(
  claimId: string,
  input: { reason: string; evidenceUrl: string | null; submittedBy?: string }
): Claim | undefined {
  const claim = getStoredClaim(claimId);
  if (!claim) return undefined;
  const now = new Date().toISOString();
  const correction: Correction = {
    id: `cor-${Date.now().toString(36)}`,
    claimId,
    reason: input.reason.trim(),
    evidenceUrl: input.evidenceUrl,
    status: "open",
    response: null,
    submittedBy: input.submittedBy ?? "Public report",
    createdAt: now,
    resolvedAt: null,
  };
  return updateClaim(claimId, {
    corrections: [...claim.corrections, correction],
    reviewHistory: [
      ...claim.reviewHistory,
      {
        id: `rev-cor-${Date.now().toString(36)}`,
        action: "correction_submitted",
        author: correction.submittedBy,
        note: `Reported a problem: ${correction.reason}`,
        createdAt: now,
      },
    ],
  });
}

const SESSION_KEY = "vq.session.id";

export function getSessionId(): string {
  if (!hasStorage()) return "server";
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `sid-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export function hasVotedSameClaim(claimId: string): boolean {
  const claim = getStoredClaim(claimId);
  if (!claim) return false;
  return (claim.sameClaimVoterIds ?? []).includes(getSessionId());
}

export const MIN_COMMUNITY_REVIEW_NOTE_LENGTH = 20;

export interface SubmitCommunityReviewInput {
  reviewerLabel?: string;
  stance: CommunityReviewStance;
  note: string;
  evidenceUrls?: string[];
  confidence: ReviewConfidence;
}

export type SubmitCommunityReviewResult =
  | { ok: true; claim: Claim; review: CommunityReview }
  | { ok: false; error: string; claim?: Claim };

export function hasReviewedCommunity(claimId: string): boolean {
  const claim = getStoredClaim(claimId);
  if (!claim) return false;
  const sessionId = getSessionId();
  return (claim.communityReviews ?? []).some(
    (review) => review.sessionId === sessionId
  );
}

/**
 * Appends an independent reviewer assessment from the public feed.
 * Multiple reviewers may each submit one assessment. Never edits claim text,
 * never overwrites publishedReview, and never auto-labels a claim true/false.
 */
export function submitCommunityReview(
  claimId: string,
  input: SubmitCommunityReviewInput
): SubmitCommunityReviewResult {
  const claim = getStoredClaim(claimId);
  if (!claim) return { ok: false, error: "Claim not found." };
  if (claim.isDeleted)
    return { ok: false, error: "This claim was removed from the public feed." };

  const sessionId = getSessionId();
  const existing = (claim.communityReviews ?? []).find(
    (review) => review.sessionId === sessionId
  );
  if (existing) {
    return {
      ok: false,
      error: "You already submitted an independent review for this claim.",
      claim,
    };
  }

  const note = input.note.trim();
  if (note.length < MIN_COMMUNITY_REVIEW_NOTE_LENGTH) {
    return {
      ok: false,
      error: `Write a review note of at least ${MIN_COMMUNITY_REVIEW_NOTE_LENGTH} characters.`,
      claim,
    };
  }

  const evidenceUrls = (input.evidenceUrls ?? [])
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
  for (const url of evidenceUrls) {
    if (!/^https?:\/\//i.test(url)) {
      return {
        ok: false,
        error: "Evidence URLs must start with http:// or https://.",
        claim,
      };
    }
  }

  const now = new Date().toISOString();
  const reviewerLabel =
    input.reviewerLabel?.trim().slice(0, 60) || "Community reviewer";
  const review: CommunityReview = {
    id: `cr-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    reviewerLabel,
    stance: input.stance,
    note,
    evidenceUrls,
    confidence: input.confidence,
    sessionId,
    createdAt: now,
  };

  const next = updateClaim(claimId, {
    communityReviews: [...(claim.communityReviews ?? []), review],
    reviewHistory: [
      ...claim.reviewHistory,
      {
        id: `rev-cr-${Date.now().toString(36)}`,
        action: "community_review",
        author: reviewerLabel,
        note:
          evidenceUrls.length > 0
            ? `${note} Sources: ${evidenceUrls.join(", ")}`
            : note,
        createdAt: now,
      },
    ],
  });

  if (!next) return { ok: false, error: "Could not save this review.", claim };
  return { ok: true, claim: next, review };
}

export function voteSameClaim(claimId: string): Claim | undefined {
  const claim = getStoredClaim(claimId);
  if (!claim) return undefined;
  const sessionId = getSessionId();
  const voters = claim.sameClaimVoterIds ?? [];
  if (voters.includes(sessionId)) return claim;
  const now = new Date().toISOString();
  return updateClaim(claimId, {
    sameClaimCount: (claim.sameClaimCount ?? 0) + 1,
    sameClaimVoterIds: [...voters, sessionId],
    reviewHistory: [
      ...claim.reviewHistory,
      {
        id: `rev-same-${Date.now().toString(36)}`,
        action: "same_claim_vote",
        author: "Public report",
        note: "A member of the public marked this as the same claim they wanted to submit.",
        createdAt: now,
      },
    ],
  });
}

export function findSimilarForVote(
  claimText: string,
  limit = 3
): { id: string; title: string; body: string; score: number }[] {
  const text = claimText.trim().toLowerCase();
  if (text.length < 10) return [];
  const tokens = new Set(
    text
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 3)
  );
  if (tokens.size === 0) return [];
  const minScore = Math.max(3, Math.ceil(tokens.size * 0.35));
  return readAll()
    .filter((claim) => !claim.isDeleted)
    .map((claim) => {
      const other = `${claim.title} ${claim.body}`.toLowerCase();
      let hits = 0;
      for (const token of tokens) {
        if (other.includes(token)) hits += 1;
      }
      return { id: claim.id, title: claim.title, body: claim.body, score: hits };
    })
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
