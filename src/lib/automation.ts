import type {
  Claim,
  ClaimStatus,
  EvidenceJobKind,
  EvidenceRecord,
  FactCheckRef,
  IntakeCheck,
  IntakeStatus,
  ReviewConfidence,
  EvidenceStrength,
  SimilarClaimRef,
  Verdict,
} from "@/lib/types";
import { analyzeClaim } from "@/lib/risk-analysis";

export const COMMUNITY_REVIEWER = "Community reviewer";

export const AUTOMATION_DISCLAIMER =
  "Automated evidence gathering organizes references for review. It does not determine whether the claim is true or false.";

export const HUMAN_REVIEW_MESSAGE =
  "Final verdicts are published only after a reviewer reads the evidence and records an explanation.";

export const MIN_REVIEW_NOTE_LENGTH = 20;
export const MIN_ANALYSIS_FIELD_LENGTH = 15;

export interface EvidenceJobResult {
  kind: EvidenceJobKind;
  title: string;
  status: EvidenceRecord["status"];
  summary: string;
  url?: string | null;
  detail?: string | null;
  httpStatus?: number | null;
  finalUrl?: string | null;
  pageTitle?: string | null;
  archiveUrl?: string | null;
  isArchived?: boolean;
  isExternalFactCheck?: boolean;
  sourceName?: string | null;
  externalRating?: string | null;
  createdAt?: string;
}

export interface EvidenceDeskRequest {
  claimId: string;
  claimText: string;
  sourceUrl: string | null;
  similarPool?: { id: string; title: string; body: string }[];
  forceFail?: boolean;
}

export interface EvidenceDeskResponse {
  ok: boolean;
  error?: string;
  jobs: EvidenceJobResult[];
  factCheckMatches: FactCheckRef[];
  factCheckConfigured: boolean;
  intakeStatus?: IntakeStatus;
  intakeChecks?: IntakeCheck[];
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const EVIDENCE_ERROR_STATUSES = new Set(["error"]);

export function decideIntakeStatus(
  jobs: EvidenceJobResult[]
): { intakeStatus: IntakeStatus; intakeError: string | null } {
  const blocked = jobs.find(
    (job) => job.kind === "spam_abuse_pii" && job.status === "error"
  );
  if (blocked) {
    return {
      intakeStatus: "blocked",
      intakeError: blocked.summary,
    };
  }

  const formatFailed = jobs.find(
    (job) => job.kind === "claim_format" && job.status === "error"
  );
  if (formatFailed) {
    return {
      intakeStatus: "failed",
      intakeError: formatFailed.summary,
    };
  }

  const errorCount = jobs.filter((job) =>
    EVIDENCE_ERROR_STATUSES.has(job.status)
  ).length;
  const warnCount = jobs.filter((job) => job.status === "warn").length;
  const noSource = jobs.some(
    (job) =>
      job.kind === "source_reachability" && job.status === "skipped"
  );

  if (errorCount > 0 && errorCount >= Math.max(1, jobs.length / 2)) {
    return {
      intakeStatus: "failed",
      intakeError: "Several automated intake checks failed.",
    };
  }

  if (noSource || warnCount > 0 || errorCount > 0) {
    return {
      intakeStatus: "needs_more_context",
      intakeError: errorCount > 0 ? "Some source checks could not complete." : null,
    };
  }

  return { intakeStatus: "ready_for_review", intakeError: null };
}

export function jobsToIntakeChecks(
  claimId: string,
  jobs: EvidenceJobResult[]
): IntakeCheck[] {
  const now = new Date().toISOString();
  return jobs.map((job, index) => {
    const status: IntakeCheck["status"] =
      job.status === "ok"
        ? "passed"
        : job.status === "warn"
          ? "warning"
          : job.status === "error"
            ? job.kind === "spam_abuse_pii"
              ? "blocked"
              : "failed"
            : "passed";
    return {
      id: `ic-${claimId}-${index}-${Date.now().toString(36)}`,
      claimId,
      checkType: job.kind,
      status,
      result: job.summary,
      errorMessage: job.status === "error" ? job.summary : null,
      startedAt: now,
      completedAt: now,
      createdAt: now,
    };
  });
}

export function claimFormatJob(claimText: string): EvidenceJobResult {
  const trimmed = claimText.trim();
  if (trimmed.length < 10) {
    return {
      kind: "claim_format",
      title: "Claim format",
      status: "error",
      summary: "Claim text is too short to triage (minimum 10 characters).",
    };
  }
  if (trimmed.length > 5000) {
    return {
      kind: "claim_format",
      title: "Claim format",
      status: "warn",
      summary: "Claim text is very long; reviewers may need a shorter excerpt.",
    };
  }
  return {
    kind: "claim_format",
    title: "Claim format",
    status: "ok",
    summary: `Claim format passed (${trimmed.length} characters).`,
  };
}

// NOTE: The SSN regex below matches the "XXX-XX-XXXX" / "XXX XX XXXX" family.
// It has a known false-positive risk with some phone number formats.
// This is a triage signal — the claim is never blocked automatically.
const ABUSE_PATTERNS: RegExp[] = [
  /\bi\s+will\s+kill\b/i,
  /\bkill\s+(him|her|them|yourself)\b/i,
  /\bgo\s+die\b/i,
  /\bcredit\s+card\s+number\b/i,
  /\bsocial\s+security\s+number\b/i,
  /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/, // SSN — requires separators to reduce phone false-positives
  /\bpassword\s*[:=]\s*\S+/i,
];

export function spamAbusePiiJob(claimText: string): EvidenceJobResult {
  const hits = ABUSE_PATTERNS.filter((pattern) => pattern.test(claimText));
  if (hits.length > 0) {
    return {
      kind: "spam_abuse_pii",
      title: "Spam, abuse, and personal data",
      status: "error",
      summary:
        "Submission may contain abusive language or personal data. Held for safety review — not a truth judgment.",
    };
  }
  const urls = claimText.match(/https?:\/\//gi)?.length ?? 0;
  if (urls >= 8) {
    return {
      kind: "spam_abuse_pii",
      title: "Spam, abuse, and personal data",
      status: "warn",
      summary: "Unusually many links — flagged as possible spam for review.",
    };
  }
  return {
    kind: "spam_abuse_pii",
    title: "Spam, abuse, and personal data",
    status: "ok",
    summary: "No spam, abuse, or personal-data patterns detected.",
  };
}

export function presentationSignalJob(claimText: string): EvidenceJobResult {
  const analysis = analyzeClaim({ claimText });
  const labels = analysis.flags.map((f) => f.label);
  return {
    kind: "presentation_signals",
    title: "Presentation signals",
    status: analysis.flags.length > 0 ? "ok" : "skipped",
    summary:
      analysis.flags.length > 0
        ? `${analysis.flags.length} signal${
            analysis.flags.length === 1 ? "" : "s"
          }: ${labels.join(", ")}. Risk tier: ${analysis.riskLevel}.`
        : "No presentation signals detected for this text.",
    detail: `Risk level ${analysis.riskLevel}. Signals guide review priority only — never a verdict.`,
  };
}

export function findSimilarClaims(
  claimId: string,
  claimText: string,
  pool: { id: string; title: string; body: string }[]
): SimilarClaimRef[] {
  const tokens = new Set(
    claimText
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 3)
  );
  if (tokens.size === 0) return [];

  return pool
    .filter((item) => item.id !== claimId)
    .map((item) => {
      const other = `${item.title} ${item.body}`.toLowerCase();
      let hits = 0;
      for (const token of tokens) {
        if (other.includes(token)) hits += 1;
      }
      return { id: item.id, title: item.title, score: hits };
    })
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ id, title }) => ({ id, title }));
}

export function similarClaimsJob(
  claimId: string,
  claimText: string,
  pool: { id: string; title: string; body: string }[]
): EvidenceJobResult {
  const similar = findSimilarClaims(claimId, claimText, pool);
  return {
    kind: "similar_claims",
    title: "Similar claims",
    status: similar.length > 0 ? "ok" : "skipped",
    summary:
      similar.length > 0
        ? `${similar.length} related claim${
            similar.length === 1 ? "" : "s"
          } already in the queue.`
        : "No similar claims found in the queue.",
    detail:
      similar.length > 0
        ? similar.map((s) => `${s.title} (${s.id})`).join(" · ")
        : undefined,
  };
}

export function duplicateClaimsJob(
  claimId: string,
  claimText: string,
  pool: { id: string; title: string; body: string }[]
): EvidenceJobResult {
  const similar = findSimilarClaims(claimId, claimText, pool);
  if (similar.length === 0) {
    return {
      kind: "duplicate_claims",
      title: "Duplicate claims",
      status: "ok",
      summary: "No duplicate claims detected in the shared claims feed.",
    };
  }
  return {
    kind: "duplicate_claims",
    title: "Duplicate claims",
    status: "warn",
    summary: `${similar.length} potential duplicate${
      similar.length === 1 ? "" : "s"
    } found. Reviewers should compare before publishing.`,
    detail: similar.map((s) => `${s.title} (${s.id})`).join(" · "),
  };
}

export function noSourceJobs(): EvidenceJobResult[] {
  return [
    {
      kind: "source_reachability",
      title: "Source reachability",
      status: "skipped",
      summary: "No source URL was provided with this claim.",
    },
    {
      kind: "source_metadata",
      title: "Source metadata",
      status: "skipped",
      summary: "Skipped — no source URL to inspect.",
    },
    {
      kind: "wayback_archive",
      title: "Wayback archive",
      status: "skipped",
      summary: "Skipped — no source URL to archive.",
    },
    {
      kind: "fact_check_search",
      title: "External fact-check references",
      status: "skipped",
      summary:
        "No source URL and no configured fact-check search endpoint for free-text queries.",
    },
  ];
}

export function jobsToEvidence(
  claimId: string,
  jobs: EvidenceJobResult[]
): EvidenceRecord[] {
  const now = new Date().toISOString();
  return jobs.map((job, index) => ({
    id: `ev-${claimId}-${index}-${Date.now().toString(36)}`,
    claimId,
    kind: job.kind,
    title: job.title,
    status: job.status,
    summary: job.summary,
    url: job.archiveUrl ?? job.url ?? null,
    detail: job.detail ?? null,
    httpStatus: job.httpStatus ?? null,
    finalUrl: job.finalUrl ?? null,
    retrievedAt: job.createdAt ?? now,
    isArchived: job.isArchived ?? (job.kind === "wayback_archive" && job.status === "ok"),
    isExternalFactCheck:
      job.isExternalFactCheck ?? job.kind === "fact_check_search",
    sourceName: job.sourceName ?? null,
    externalRating: job.externalRating ?? null,
    createdBy: "Automated evidence desk",
    createdAt: now,
  }));
}

export interface PublishReviewInput {
  note: string;
  evidenceUrls: string[];
  verdict: Verdict;
  claimInterpretation: string;
  supportingAnalysis: string;
  contradictingAnalysis: string;
  contextAnalysis: string;
  evidenceStrength: EvidenceStrength;
  confidence: ReviewConfidence;
  qualityChecklist: {
    dateChecked: boolean;
    locationChecked: boolean;
    scopeChecked: boolean;
  };
}

export interface PublishReviewValidation {
  ok: boolean;
  errors: string[];
}

function requireAnalysisField(
  errors: string[],
  label: string,
  value: string
): void {
  if (value.trim().length < MIN_ANALYSIS_FIELD_LENGTH) {
    errors.push(
      `${label} must be at least ${MIN_ANALYSIS_FIELD_LENGTH} characters.`
    );
  }
}

export function validatePublishReview(
  input: PublishReviewInput
): PublishReviewValidation {
  const errors: string[] = [];
  const note = input.note.trim();
  if (note.length < MIN_REVIEW_NOTE_LENGTH) {
    errors.push(
      `Reviewer note must be at least ${MIN_REVIEW_NOTE_LENGTH} characters.`
    );
  }
  const validUrls = input.evidenceUrls
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
  if (validUrls.length === 0) {
    errors.push("At least one evidence URL is required to publish a verdict.");
  } else if (!validUrls.every((url) => isValidHttpUrl(url))) {
    errors.push("Evidence URLs must start with http:// or https://.");
  }
  if (!["verified_true", "verified_false", "misleading"].includes(input.verdict)) {
    errors.push("Choose Verified True, Verified False, or Misleading.");
  }

  requireAnalysisField(errors, "Claim interpretation", input.claimInterpretation);
  requireAnalysisField(errors, "Supporting evidence analysis", input.supportingAnalysis);
  requireAnalysisField(
    errors,
    "Contradicting evidence analysis",
    input.contradictingAnalysis
  );
  requireAnalysisField(errors, "Date, location, and scope analysis", input.contextAnalysis);

  if (!["insufficient", "limited", "moderate", "strong"].includes(input.evidenceStrength)) {
    errors.push("Choose an evidence strength.");
  }
  if (!["low", "medium", "high"].includes(input.confidence)) {
    errors.push("Choose a review confidence level.");
  }

  const checklist = input.qualityChecklist;
  if (!checklist?.dateChecked || !checklist?.locationChecked || !checklist?.scopeChecked) {
    errors.push(
      "Complete the quality checklist: confirm date, location, and scope."
    );
  }

  return { ok: errors.length === 0, errors };
}

export function qualityChecklistPassed(
  checklist: PublishReviewInput["qualityChecklist"]
): boolean {
  return Boolean(
    checklist?.dateChecked && checklist?.locationChecked && checklist?.scopeChecked
  );
}

export function canPublishVerdict(claim: Claim): boolean {
  return claim.publishedReview == null;
}

export function isFinalStatus(status: ClaimStatus): boolean {
  return (
    status === "verified_true" ||
    status === "verified_false" ||
    status === "misleading"
  );
}

export function buildAutomationEntry(
  automationStatus: Claim["automationStatus"],
  evidenceCount: number
): Claim["reviewHistory"][number] {
  const now = new Date().toISOString();
  if (automationStatus === "completed") {
    return {
      id: `rev-auto-${Date.now().toString(36)}`,
      action: "automation_complete",
      author: "Automated evidence desk",
      note: `Evidence gathering finished with ${evidenceCount} record${
        evidenceCount === 1 ? "" : "s"
      }. Claim status remains Unverified until a human review is published.`,
      createdAt: now,
    };
  }
  if (automationStatus === "partially_completed") {
    return {
      id: `rev-auto-${Date.now().toString(36)}`,
      action: "automation_complete",
      author: "Automated evidence desk",
      note: `Evidence gathering partially finished with ${evidenceCount} record${
        evidenceCount === 1 ? "" : "s"
      }. Some checks failed. Claim status remains Unverified.`,
      createdAt: now,
    };
  }
  return {
    id: `rev-auto-${Date.now().toString(36)}`,
    action: "automation_complete",
    author: "Automated evidence desk",
    note: "Evidence gathering failed. Partial records (if any) are shown for review. Claim status remains Unverified.",
    createdAt: now,
  };
}

/**
 * Returns a human-readable label for a verdict status.
 * Uses evidence-state language — never absolute truth labels.
 * See AGENTS.md: "Never automatically label a claim true or false."
 */
export function verdictStatusLabel(verdict: Verdict): string {
  if (verdict === "verified_true") return "Evidence Supports";
  if (verdict === "verified_false") return "Evidence Contradicts";
  return "Needs Context";
}
