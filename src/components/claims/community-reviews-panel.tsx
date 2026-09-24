"use client";

import { ExternalLinkIcon, ScaleIcon, UsersIcon } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import {
  COMMUNITY_REVIEW_DISCLAIMER,
  COMMUNITY_REVIEW_STANCE_META,
  REVIEW_CONFIDENCE_META,
} from "@/lib/meta";
import type { Claim } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CommunityReviewsPanel({ claim }: { claim: Claim }) {
  const reviews = claim.communityReviews ?? [];

  return (
    <section
      aria-labelledby="community-reviews-heading"
      className="rounded-xl border border-border bg-card p-6 shadow-sm"
      data-testid="community-reviews-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground ring-1 ring-cyan-signal/30">
            <UsersIcon aria-hidden className="size-4 text-cyan-deep" />
          </span>
          <div>
            <h2
              id="community-reviews-heading"
              className="font-heading text-base font-normal text-navy"
            >
              Independent reviews
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {COMMUNITY_REVIEW_DISCLAIMER}
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {reviews.length} review{reviews.length === 1 ? "" : "s"}
        </span>
      </div>

      {reviews.length === 0 ? (
        <p
          className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-5 text-sm leading-relaxed text-muted-foreground"
          data-testid="community-reviews-empty"
        >
          No independent reviews yet. Use{" "}
          <strong className="text-navy">Add review</strong> on the feed or open
          the form above to record your assessment with supporting notes.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((review) => {
            const stance = COMMUNITY_REVIEW_STANCE_META[review.stance];
            return (
              <li
                key={review.id}
                className="rounded-lg border border-border bg-background/60 p-4"
                data-testid={`community-review-${review.id}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase",
                      stance.badgeClass
                    )}
                  >
                    {stance.label}
                  </span>
                  <span className="text-xs font-medium text-navy">
                    {review.reviewerLabel}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                      REVIEW_CONFIDENCE_META[review.confidence].badgeClass
                    )}
                  >
                    {REVIEW_CONFIDENCE_META[review.confidence].label}
                  </span>
                  <time
                    dateTime={review.createdAt}
                    className="ml-auto text-xs text-muted-foreground"
                  >
                    {formatDateTime(review.createdAt)}
                  </time>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                  {review.note}
                </p>
                {review.evidenceUrls.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {review.evidenceUrls.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-deep underline-offset-4 hover:underline"
                        >
                          {url}
                          <ExternalLinkIcon aria-hidden className="size-3.5" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ScaleIcon aria-hidden className="size-3.5" />
                  {stance.description} Independent assessment — not the official
                  verdict.
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
