"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRightIcon,
  CalendarIcon,
  ShieldAlertIcon,
  Settings2Icon,
  ThumbsUpIcon,
  UsersIcon,
} from "lucide-react";
import { CategoryBadge, RiskLevelBadge, StatusBadge } from "@/components/claims/badges";
import { excerpt, formatDate } from "@/lib/format";
import { hasVotedSameClaim, voteSameClaim } from "@/lib/claim-store";
import type { Claim } from "@/lib/types";
import { toast } from "sonner";

export function ClaimCard({
  claim,
  onStatusChange,
  onAddReview,
}: {
  claim: Claim;
  index?: number;
  onStatusChange?: (claim: Claim) => void;
  onAddReview?: (claim: Claim) => void;
}) {
  const [voted, setVoted] = useState(() => hasVotedSameClaim(claim.id));
  const count = claim.sameClaimCount ?? 0;
  const reviewCount = claim.communityReviews?.length ?? 0;

  function handleVote(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (voted) return;
    const updated = voteSameClaim(claim.id);
    if (updated) {
      setVoted(true);
      toast.success("Marked as the same claim.", {
        description: "This is a public signal — not a truth judgment.",
      });
    }
  }

  function handleAddReview(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onAddReview?.(claim);
  }

  return (
    <article className="group relative">
      <Link
        href={`/claims/${claim.id}`}
        className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-all outline-none hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-6"
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={claim.claimStatus} />
          <CategoryBadge category={claim.category} />
          {claim.riskLevel === "high" && <RiskLevelBadge level={claim.riskLevel} />}
          {count > 0 && (
            <span
              data-testid={`same-claim-count-${claim.id}`}
              className="inline-flex items-center gap-1 rounded-full border border-cyan-signal/30 bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground tabular-nums"
            >
              <ThumbsUpIcon aria-hidden className="size-3" />
              {count} same claim{count === 1 ? "" : "s"}
            </span>
          )}
          {reviewCount > 0 && (
            <span
              data-testid={`community-review-count-${claim.id}`}
              className="inline-flex items-center gap-1 rounded-full border border-teal-300 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800 tabular-nums"
            >
              <UsersIcon aria-hidden className="size-3" />
              {reviewCount} review{reviewCount === 1 ? "" : "s"}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
            <CalendarIcon aria-hidden className="size-3.5" />
            {formatDate(claim.submittedAt)}
          </span>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg leading-snug font-semibold text-foreground transition-colors group-hover:text-cyan-deep sm:text-xl">
            {claim.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {excerpt(claim.body)}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 pr-40 sm:pr-44">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ShieldAlertIcon aria-hidden className="size-3.5 text-cyan-deep" />
            {claim.riskFlags.length} signal{claim.riskFlags.length === 1 ? "" : "s"} ·{" "}
            {claim.reviewHistory.length} review entr
            {claim.reviewHistory.length === 1 ? "y" : "ies"}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground transition-colors group-hover:text-cyan-deep">
            View evidence trail
            <ArrowRightIcon
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </Link>
      <div className="absolute right-3 bottom-3 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={handleAddReview}
          aria-label={`Add independent review for ${claim.title}`}
          data-testid={`add-review-${claim.id}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background/95 px-3 text-xs font-semibold text-muted-foreground opacity-0 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-400 hover:text-teal-800 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <UsersIcon aria-hidden className="size-3.5" />
          Add review
        </button>
        <button
          type="button"
          onClick={handleVote}
          disabled={voted}
          aria-label={voted ? "You already marked this as the same claim" : "Same claim — I wanted to post this"}
          data-testid={`same-claim-vote-${claim.id}`}
          className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all ${
            voted
              ? "cursor-default border-cyan-signal/40 bg-accent text-accent-foreground opacity-100"
              : "border-border bg-background/95 text-muted-foreground opacity-0 shadow-sm hover:-translate-y-0.5 hover:border-cyan-signal/50 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
          }`}
        >
          <ThumbsUpIcon aria-hidden className="size-3.5" />
          {voted ? "Same claim" : count > 0 ? `Same claim · ${count}` : "Same claim"}
        </button>
      </div>
      {onStatusChange && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onStatusChange(claim);
          }}
          aria-label={`Change status for ${claim.title}`}
          data-testid={`status-change-${claim.id}`}
          className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-md border border-border bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <Settings2Icon aria-hidden className="size-4" />
        </button>
      )}
    </article>
  );
}
