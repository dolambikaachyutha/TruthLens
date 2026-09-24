import type {
  AutomationStatus,
  ClaimCategory,
  ClaimStatus,
  CommunityReviewStance,
  DeleteReason,
  EvidenceJobStatus,
  EvidenceStrength,
  FlagSeverity,
  IntakeStatus,
  ReviewConfidence,
  ReviewActionType,
  RiskLevel,
  Verdict,
} from "@/lib/types";

export const STATUS_META: Record<
  ClaimStatus,
  { label: string; short: string; description: string; badgeClass: string; dotClass: string }
> = {
  unverified: {
    label: "Unverified",
    short: "Unverified",
    description: "Submitted and awaiting a first reviewer pass.",
    badgeClass: "border-slate-300 bg-slate-50 text-slate-700",
    dotClass: "bg-slate-400",
  },
  in_review: {
    label: "In Review",
    short: "In review",
    description: "A reviewer is actively gathering evidence.",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    dotClass: "bg-blue-500",
  },
  verified_true: {
    label: "Evidence Supports",
    short: "Evidence supports",
    description: "A reviewer found publicly available evidence consistent with the claim. This does not mean the claim is absolutely true.",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  verified_false: {
    label: "Evidence Contradicts",
    short: "Evidence contradicts",
    description: "A reviewer could not find evidence supporting the claim, or found evidence that contradicts it. This is not a final determination.",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
    dotClass: "bg-red-500",
  },
  misleading: {
    label: "Misleading",
    short: "Misleading",
    description: "A reviewer found missing context that distorts the claim.",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    dotClass: "bg-amber-500",
  },
};

export const INTAKE_STATUS_META: Record<
  IntakeStatus,
  { label: string; description: string; badgeClass: string; dotClass: string }
> = {
  submitted: {
    label: "Submitted",
    description: "Claim received. Automated intake has not started yet.",
    badgeClass: "border-slate-300 bg-slate-50 text-slate-700",
    dotClass: "bg-slate-400",
  },
  checking: {
    label: "Checking",
    description: "Automated intake checks are running. Claim stays Unverified.",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    dotClass: "bg-blue-500",
  },
  ready_for_review: {
    label: "Ready for review",
    description: "Intake checks finished. Claim is ready for a human reviewer.",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  needs_more_context: {
    label: "Needs more context",
    description:
      "Intake found gaps (for example a missing source). Reviewers may still open it. Status stays Unverified.",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    dotClass: "bg-amber-500",
  },
  blocked: {
    label: "Blocked",
    description:
      "Intake blocked this submission for safety review. It is never auto-labelled true or false.",
    badgeClass: "border-red-300 bg-red-50 text-red-700",
    dotClass: "bg-red-500",
  },
  failed: {
    label: "Intake failed",
    description:
      "Automated intake could not finish. Partial records may still help a reviewer. Status remains Unverified.",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
    dotClass: "bg-red-500",
  },
};

export const CATEGORY_META: Record<
  ClaimCategory,
  { label: string; badgeClass: string; icon: "landmark" | "heart" | "finance" | "layers" }
> = {
  politics: {
    label: "Politics",
    badgeClass: "border-slate-200 bg-white text-slate-600",
    icon: "landmark",
  },
  health: {
    label: "Health",
    badgeClass: "border-slate-200 bg-white text-slate-600",
    icon: "heart",
  },
  finance: {
    label: "Finance",
    badgeClass: "border-slate-200 bg-white text-slate-600",
    icon: "finance",
  },
  other: {
    label: "Other",
    badgeClass: "border-slate-200 bg-white text-slate-600",
    icon: "layers",
  },
};

export const RISK_LEVEL_META: Record<
  RiskLevel,
  { label: string; priorityLabel: string; badgeClass: string; dotClass: string }
> = {
  high: {
    label: "High risk",
    priorityLabel: "High review priority",
    badgeClass: "border-red-300 bg-red-50 text-red-700",
    dotClass: "bg-red-500",
  },
  medium: {
    label: "Medium risk",
    priorityLabel: "Medium review priority",
    badgeClass: "border-amber-300 bg-amber-50 text-amber-800",
    dotClass: "bg-amber-500",
  },
  low: {
    label: "Low risk",
    priorityLabel: "Low review priority",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
};

export const SEVERITY_META: Record<
  FlagSeverity,
  { label: string; dotClass: string; chipClass: string }
> = {
  high: {
    label: "High signal",
    dotClass: "bg-red-500",
    chipClass: "border-red-200 bg-red-50 text-red-700",
  },
  medium: {
    label: "Medium signal",
    dotClass: "bg-amber-500",
    chipClass: "border-amber-200 bg-amber-50 text-amber-800",
  },
  low: {
    label: "Low signal",
    dotClass: "bg-blue-500",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
};

export const REVIEW_ACTION_LABELS: Record<ReviewActionType, string> = {
  submitted: "Claim submitted",
  started_review: "Review started",
  status_change: "Status recorded",
  evidence_note: "Evidence note",
  automation_complete: "Automation finished",
  verdict_published: "Verdict published",
  correction_submitted: "Correction reported",
  same_claim_vote: "Same claim marked",
  community_review: "Independent review",
  deleted: "Claim deleted",
};

export const COMMUNITY_REVIEW_STANCE_META: Record<
  CommunityReviewStance,
  { label: string; description: string; badgeClass: string; dotClass: string }
> = {
  evidence_supports: {
    label: "Evidence supports",
    description:
      "This reviewer found public evidence that is consistent with the claim.",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  evidence_contradicts: {
    label: "Evidence contradicts",
    description:
      "This reviewer found public evidence that conflicts with the claim.",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
    dotClass: "bg-red-500",
  },
  needs_context: {
    label: "Needs context",
    description:
      "This reviewer believes important context is missing from the claim.",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    dotClass: "bg-amber-500",
  },
  unclear: {
    label: "Unclear yet",
    description:
      "This reviewer could not reach a clear reading from available evidence.",
    badgeClass: "border-slate-300 bg-slate-50 text-slate-700",
    dotClass: "bg-slate-400",
  },
};

export const COMMUNITY_REVIEW_STANCE_OPTIONS: {
  value: CommunityReviewStance;
  label: string;
}[] = [
  { value: "evidence_supports", label: "Evidence supports" },
  { value: "evidence_contradicts", label: "Evidence contradicts" },
  { value: "needs_context", label: "Needs context" },
  { value: "unclear", label: "Unclear yet" },
];

export const COMMUNITY_REVIEW_DISCLAIMER =
  "Independent reviews are reviewer opinions with supporting notes. They are not official verdicts and are never automatically labeled true or false.";

export const DELETE_REASON_LABELS: Record<DeleteReason, string> = {
  spam: "Spam",
  duplicate: "Duplicate",
  personal_information: "Personal information",
  safety_issue: "Safety issue",
  malicious_link: "Malicious link",
  test_submission: "Test submission",
  policy_violation: "Policy violation",
  other: "Other",
};

export const AUTOMATION_STATUS_META: Record<
  AutomationStatus,
  { label: string; description: string; badgeClass: string; dotClass: string }
> = {
  not_started: {
    label: "Not started",
    description: "Automated evidence gathering has not started for this claim.",
    badgeClass: "border-slate-300 bg-slate-50 text-slate-700",
    dotClass: "bg-slate-400",
  },
  queued: {
    label: "Queued",
    description: "Automated evidence gathering is queued for this claim.",
    badgeClass: "border-slate-300 bg-slate-50 text-slate-700",
    dotClass: "bg-slate-400",
  },
  running: {
    label: "Running",
    description:
      "The automated evidence desk is collecting references for this claim.",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    dotClass: "bg-blue-500",
  },
  completed: {
    label: "Complete",
    description:
      "Automated evidence gathering finished. Status stays Unverified until a human review is published.",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  partially_completed: {
    label: "Partial",
    description:
      "Some evidence jobs finished and others failed. Records are shown for review. Status stays Unverified.",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    dotClass: "bg-amber-500",
  },
  failed: {
    label: "Failed",
    description:
      "Automated evidence gathering failed. Partial records may still help a reviewer. Status remains Unverified.",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
    dotClass: "bg-red-500",
  },
};

export const EVIDENCE_STATUS_META: Record<
  EvidenceJobStatus,
  { label: string; chipClass: string; dotClass: string }
> = {
  ok: {
    label: "Found",
    chipClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  warn: {
    label: "Partial",
    chipClass: "border-amber-200 bg-amber-50 text-amber-800",
    dotClass: "bg-amber-500",
  },
  error: {
    label: "Error",
    chipClass: "border-red-200 bg-red-50 text-red-700",
    dotClass: "bg-red-500",
  },
  skipped: {
    label: "Skipped",
    chipClass: "border-slate-200 bg-slate-50 text-slate-600",
    dotClass: "bg-slate-400",
  },
};

export const VERDICT_META: Record<
  Verdict,
  { label: string; badgeClass: string; dotClass: string }
> = {
  verified_true: {
    label: "Evidence Supports",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  verified_false: {
    label: "Evidence Contradicts",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
    dotClass: "bg-red-500",
  },
  misleading: {
    label: "Needs Context",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    dotClass: "bg-amber-500",
  },
};

export const EVIDENCE_STRENGTH_META: Record<
  EvidenceStrength,
  { label: string; description: string; badgeClass: string }
> = {
  insufficient: {
    label: "Insufficient",
    description: "Available evidence is not enough to support a confident reading.",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
  },
  limited: {
    label: "Limited",
    description: "Evidence exists but leaves substantial gaps.",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
  },
  moderate: {
    label: "Moderate",
    description: "Evidence covers the main points with some gaps remaining.",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  strong: {
    label: "Strong",
    description: "Multiple consistent sources support the reading.",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

export const REVIEW_CONFIDENCE_META: Record<
  ReviewConfidence,
  { label: string; description: string; badgeClass: string }
> = {
  low: {
    label: "Low confidence",
    description: "Important details remain unclear or contested.",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
  },
  medium: {
    label: "Medium confidence",
    description: "Most points are supported; some uncertainty remains.",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  high: {
    label: "High confidence",
    description: "Evidence consistently supports this reading.",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

export const CATEGORY_OPTIONS: { value: ClaimCategory | "all"; label: string }[] = [
  { value: "all", label: "All categories" },
  { value: "politics", label: "Politics" },
  { value: "health", label: "Health" },
  { value: "finance", label: "Finance" },
  { value: "other", label: "Other" },
];

export const STATUS_OPTIONS: { value: ClaimStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "unverified", label: "Unverified" },
  { value: "in_review", label: "In Review" },
  { value: "verified_true", label: "Evidence Supports" },
  { value: "verified_false", label: "Evidence Contradicts" },
  { value: "misleading", label: "Needs Context" },
];

export const RISK_OPTIONS: { value: RiskLevel | "all"; label: string }[] = [
  { value: "all", label: "All risk levels" },
  { value: "high", label: "High risk" },
  { value: "medium", label: "Medium risk" },
  { value: "low", label: "Low risk" },
];

export const PLATFORM_OPTIONS_FILTER: {
  value: string | "all";
  label: string;
}[] = [
  { value: "all", label: "All platforms" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X" },
  { value: "telegram", label: "Telegram" },
  { value: "instagram", label: "Instagram" },
  { value: "community", label: "Community" },
  { value: "news_site", label: "News site" },
  { value: "other", label: "Other" },
];

export const DATE_FILTER_OPTIONS: {
  value: "all" | "24h" | "7d" | "30d";
  label: string;
}[] = [
  { value: "all", label: "Any date" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

export const EVIDENCE_FILTER_OPTIONS: {
  value: "all" | "with_evidence" | "no_evidence";
  label: string;
}[] = [
  { value: "all", label: "Any evidence" },
  { value: "with_evidence", label: "Has evidence" },
  { value: "no_evidence", label: "No evidence yet" },
];

export const SORT_OPTIONS: {
  value: "same_claim" | "newest" | "oldest" | "updated" | "risk";
  label: string;
}[] = [
  { value: "same_claim", label: "Most same claims" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
  { value: "risk", label: "Highest risk" },
];

export const RISK_FLAG_DISCLAIMER =
  "Risk flags are triage signals for reviewers — they are not factual verdicts.";

export const PRESENTATION_SIGNALS_DISCLAIMER =
  "These signals describe how a claim is written or sourced. They are not a factual verdict.";
