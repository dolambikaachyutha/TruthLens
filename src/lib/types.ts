export type ClaimStatus =
  | "unverified"
  | "in_review"
  | "verified_true"
  | "verified_false"
  | "misleading";

export type ClaimCategory = "politics" | "health" | "finance" | "other";

export type RiskLevel = "high" | "medium" | "low";

export type FlagSeverity = RiskLevel;

export type IntakeStatus =
  | "submitted"
  | "checking"
  | "ready_for_review"
  | "needs_more_context"
  | "blocked"
  | "failed";

export type AutomationStatus =
  | "not_started"
  | "queued"
  | "running"
  | "completed"
  | "partially_completed"
  | "failed";

export type EvidenceStrength =
  | "insufficient"
  | "limited"
  | "moderate"
  | "strong";

export type ReviewConfidence = "low" | "medium" | "high";

export type Verdict = "verified_true" | "verified_false" | "misleading";

export type EvidenceJobKind =
  | "claim_format"
  | "spam_abuse_pii"
  | "presentation_signals"
  | "duplicate_claims"
  | "source_reachability"
  | "source_metadata"
  | "wayback_archive"
  | "fact_check_search"
  | "similar_claims";

export type EvidenceJobStatus = "ok" | "warn" | "error" | "skipped";

export type IntakeCheckStatus =
  | "queued"
  | "running"
  | "passed"
  | "warning"
  | "failed"
  | "blocked";

export interface IntakeCheck {
  id: string;
  claimId: string;
  checkType: EvidenceJobKind;
  status: IntakeCheckStatus;
  result: string;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface EvidenceRecord {
  id: string;
  claimId: string;
  kind: EvidenceJobKind;
  title: string;
  status: EvidenceJobStatus;
  summary: string;
  url?: string | null;
  detail?: string | null;
  sourceType?: string | null;
  sourceName?: string | null;
  externalRating?: string | null;
  httpStatus?: number | null;
  finalUrl?: string | null;
  retrievedAt?: string | null;
  publicationDate?: string | null;
  isArchived?: boolean;
  isExternalFactCheck?: boolean;
  isPrimarySource?: boolean;
  isIndependentSource?: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface FactCheckRef {
  title: string;
  url: string;
  publisher: string;
  rating?: string | null;
  reviewedAt?: string | null;
}

export interface SimilarClaimRef {
  id: string;
  title: string;
}

export interface RiskFlag {
  code: string;
  label: string;
  severity: FlagSeverity;
  rationale: string;
  ruleVersion?: string;
}

export type ReviewActionType =
  | "submitted"
  | "started_review"
  | "status_change"
  | "evidence_note"
  | "automation_complete"
  | "verdict_published"
  | "correction_submitted"
  | "same_claim_vote"
  | "community_review"
  | "deleted";

export const DELETE_REASONS = [
  "spam",
  "duplicate",
  "personal_information",
  "safety_issue",
  "malicious_link",
  "test_submission",
  "policy_violation",
  "other",
] as const;

export type DeleteReason = (typeof DELETE_REASONS)[number];

export interface ReviewEntry {
  id: string;
  action: ReviewActionType;
  author: string;
  note: string;
  createdAt: string;
  fromStatus?: ClaimStatus | null;
  toStatus?: ClaimStatus | null;
}

export interface HumanReview {
  reviewerLabel: string;
  startedAt: string;
  note: string;
  evidenceUrls: string[];
}

/**
 * Independent reviewer assessment submitted from the public feed.
 * Multiple reviewers may each add one assessment. These never replace the
 * official published verdict and never auto-label a claim true or false.
 */
export type CommunityReviewStance =
  | "evidence_supports"
  | "evidence_contradicts"
  | "needs_context"
  | "unclear";

export interface CommunityReview {
  id: string;
  reviewerLabel: string;
  stance: CommunityReviewStance;
  note: string;
  evidenceUrls: string[];
  confidence: ReviewConfidence;
  sessionId: string;
  createdAt: string;
}

export interface ReviewQualityChecklist {
  dateChecked: boolean;
  locationChecked: boolean;
  scopeChecked: boolean;
}

export interface PublishedReview {
  verdict: Verdict;
  reviewerLabel: string;
  note: string;
  evidenceUrls: string[];
  publishedAt: string;
  claimInterpretation: string;
  supportingAnalysis: string;
  contradictingAnalysis: string;
  contextAnalysis: string;
  evidenceStrength: EvidenceStrength;
  confidence: ReviewConfidence;
  qualityChecklist: ReviewQualityChecklist;
  qualityCheckPassed: boolean;
  conflictWarningShown?: boolean;
}

export type CorrectionStatus = "open" | "under_review" | "resolved" | "rejected";

export interface Correction {
  id: string;
  claimId: string;
  reason: string;
  evidenceUrl: string | null;
  status: CorrectionStatus;
  response: string | null;
  submittedBy: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ClaimVersion {
  id: string;
  claimId: string;
  text: string;
  sourceUrl: string | null;
  changeReason: string;
  changedBy: string;
  createdAt: string;
}

export interface Claim {
  id: string;
  title: string;
  body: string;
  category: ClaimCategory;
  platform?: string | null;
  language?: string | null;
  location?: string | null;
  context?: string | null;
  sourceUrl: string | null;
  claimStatus: ClaimStatus;
  intakeStatus: IntakeStatus;
  automationStatus: AutomationStatus;
  automatedEvidenceCount: number;
  riskLevel: RiskLevel;
  riskFlags: RiskFlag[];
  evidence: EvidenceRecord[];
  intakeChecks: IntakeCheck[];
  corrections: Correction[];
  versions: ClaimVersion[];
  submittedSessionId?: string | null;
  intakeCompletedAt?: string | null;
  intakeError?: string | null;
  isVisibleInUnderReview: boolean;
  isVisibleInReviewedFeed: boolean;
  sameClaimCount: number;
  sameClaimVoterIds: string[];
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedReason?: DeleteReason | null;
  deletedReasonDetail?: string | null;
  deletedBy?: string | null;
  isSeed?: boolean;
  versionNumber: number;
  submittedAt: string;
  updatedAt: string;
  reviewHistory: ReviewEntry[];
  humanReview: HumanReview | null;
  publishedReview: PublishedReview | null;
  communityReviews: CommunityReview[];
}

export interface ClaimSubmission {
  title: string;
  body: string;
  category: ClaimCategory;
  sourceUrl?: string;
  submitterNote?: string;
}

export const PLATFORMS = [
  "whatsapp",
  "facebook",
  "x",
  "telegram",
  "instagram",
  "community",
  "news_site",
  "other",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export interface SubmissionRecord {
  id: string;
  claimText: string;
  platform: Platform;
  category: ClaimCategory;
  sourceUrl: string | null;
  flags: RiskFlag[];
  riskLevel: RiskLevel;
  status: ClaimStatus;
  createdAt: string;
}
