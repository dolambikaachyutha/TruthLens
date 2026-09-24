import type {
  Claim,
  Correction,
  DeleteReason,
  EvidenceRecord,
  IntakeStatus,
  RiskFlag,
  RiskLevel,
} from "@/lib/types";

export const CLAIMS_STORAGE_KEY = "vq.claims.v1";

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
    automationStatus,
    intakeStatus,
    publishedReview,
    intakeChecks: claim.intakeChecks ?? [],
    corrections: claim.corrections ?? [],
    versions: claim.versions ?? [],
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
    evidence: claim.evidence ?? [],
    riskFlags: claim.riskFlags ?? [],
    reviewHistory: claim.reviewHistory ?? [],
  };
}

let cache: Claim[] | null = null;

function readAll(): Claim[] {
  if (cache) return cache;
  if (!hasStorage()) {
    cache = EMPTY_CLAIMS;
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(CLAIMS_STORAGE_KEY);
    if (!raw) {
      cache = EMPTY_CLAIMS;
      return cache;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cache = EMPTY_CLAIMS;
      return cache;
    }
    cache = (parsed as (Partial<Claim> & { id: string })[])
      .filter((item) => item && typeof item.id === "string")
      .map(migrateClaim)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return cache;
  } catch {
    cache = EMPTY_CLAIMS;
    return cache;
  }
}

function writeAll(claims: Claim[]): void {
  cache = claims;
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(claims));
  } catch {
    /* storage full or unavailable */
  }
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
  writeAll(claims);
  notify(claims);
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
  writeAll(claims);
  notify(claims);
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
    isVisibleInReviewedFeed: true,
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
  };
  return saveClaim(claim);
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
