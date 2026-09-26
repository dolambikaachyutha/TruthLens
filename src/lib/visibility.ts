import type { Claim, ClaimStatus } from "@/lib/types";

const FINAL_STATUSES: ClaimStatus[] = [
  "verified_true",
  "verified_false",
  "misleading",
];

const UNDER_REVIEW_STATUSES: ClaimStatus[] = ["unverified", "in_review"];

export function isFinalStatus(status: ClaimStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

export function isUnderReviewStatus(status: ClaimStatus): boolean {
  return UNDER_REVIEW_STATUSES.includes(status);
}

export function isDeletedClaim(claim: Claim): boolean {
  return claim.isDeleted === true;
}

/** Reviewed Claims feed — human-published verdict with quality checks. */
export function isVisibleInReviewedFeed(claim: Claim): boolean {
  if (isDeletedClaim(claim)) return false;
  if (!isFinalStatus(claim.claimStatus)) return false;
  if (!claim.publishedReview) return false;
  if (!claim.publishedReview.qualityCheckPassed) return false;
  if (claim.isVisibleInReviewedFeed === false) return false;
  return true;
}

/** Under Review feed — all unverified / in-review claims are public. */
export function isVisibleInUnderReview(claim: Claim): boolean {
  if (isDeletedClaim(claim)) return false;
  if (!isUnderReviewStatus(claim.claimStatus)) return false;
  if (claim.publishedReview) return false;
  if (claim.isVisibleInUnderReview === false) return false;
  if (isIntakeProcessing(claim)) return false;
  return true;
}

/** Clearly labeled processing claims (intake still running). */
export function isIntakeProcessing(claim: Claim): boolean {
  if (isDeletedClaim(claim)) return false;
  if (!isUnderReviewStatus(claim.claimStatus)) return false;
  if (claim.publishedReview) return false;
  return (
    claim.intakeStatus === "submitted" ||
    claim.intakeStatus === "checking" ||
    claim.automationStatus === "queued" ||
    claim.automationStatus === "running" ||
    claim.automationStatus === "not_started"
  );
}

export function isIntakeBlockedOrFailed(claim: Claim): boolean {
  return (
    claim.intakeStatus === "blocked" || claim.intakeStatus === "failed"
  );
}
