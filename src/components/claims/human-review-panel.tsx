"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ExternalLinkIcon, ScaleIcon, UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HUMAN_REVIEW_MESSAGE } from "@/lib/automation";
import { formatDateTime } from "@/lib/format";
import {
  EVIDENCE_STRENGTH_META,
  REVIEW_CONFIDENCE_META,
  STATUS_META,
  VERDICT_META,
} from "@/lib/meta";
import type { Claim } from "@/lib/types";
import { cn } from "@/lib/utils";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function HumanReviewPanel({ claim }: { claim: Claim }) {
  const reduceMotion = useReducedMotion();
  const published = claim.publishedReview;

  return (
    <section
      aria-labelledby="human-review-heading"
      className="rounded-xl border border-border bg-card p-6 shadow-sm"
      data-testid="human-review-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground ring-1 ring-cyan-signal/30">
            <ScaleIcon aria-hidden className="size-4 text-cyan-deep" />
          </span>
          <div>
            <h2
              id="human-review-heading"
              className="font-heading text-base font-normal text-navy"
            >
              Human review
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Final verdicts are published only after a reviewer reads the
              evidence and records an explanation.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          data-testid="human-review-status"
          className={cn(
            "px-2.5 text-[11px] font-semibold uppercase",
            published
              ? STATUS_META[claim.claimStatus].badgeClass
              : "border-slate-300 bg-slate-50 text-slate-700"
          )}
        >
          {published ? "Verdict published" : "Awaiting verdict"}
        </Badge>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!published ? (
          <motion.div
            key="awaiting"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.28, ease: EASE_OUT }}
            className="mt-4"
          >
            <p
              className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-5 text-sm leading-relaxed text-muted-foreground"
              data-testid="human-review-awaiting"
            >
              {HUMAN_REVIEW_MESSAGE}
            </p>
            {claim.humanReview && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/60 px-3.5 py-3 text-xs text-blue-800">
                <p className="flex items-center gap-1.5 font-semibold">
                  <UserIcon aria-hidden className="size-3.5" />
                  {claim.humanReview.reviewerLabel} opened this review
                </p>
                <p className="mt-1 text-blue-700/90">
                  Started {formatDateTime(claim.humanReview.startedAt)}.
                  Publishing still requires a note and evidence URL.
                </p>
              </div>
            )}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Claim status:{" "}
              <strong className="text-navy">
                {STATUS_META[claim.claimStatus].label}
              </strong>
              . Record a verdict from the{" "}
              <a
                href="/review"
                className="font-medium text-cyan-deep underline-offset-4 hover:underline"
              >
                reviewer workspace
              </a>
              .
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="published"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.36, ease: EASE_OUT }}
            className="mt-4 space-y-4"
            data-testid="human-review-published"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5 px-2.5 text-[11px] font-semibold uppercase",
                  VERDICT_META[published.verdict].badgeClass
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    VERDICT_META[published.verdict].dotClass
                  )}
                />
                {VERDICT_META[published.verdict].label}
              </Badge>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserIcon aria-hidden className="size-3.5" />
                {published.reviewerLabel}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${EVIDENCE_STRENGTH_META[published.evidenceStrength].badgeClass}`}
              >
                Evidence:{" "}
                {EVIDENCE_STRENGTH_META[published.evidenceStrength].label}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${REVIEW_CONFIDENCE_META[published.confidence].badgeClass}`}
              >
                Confidence: {REVIEW_CONFIDENCE_META[published.confidence].label}
              </span>
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Reviewer note
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                {published.note}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Evidence links
              </h3>
              <ul className="mt-1.5 space-y-1.5">
                {published.evidenceUrls.map((url) => (
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
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Published
              </h3>
              <time
                dateTime={published.publishedAt}
                className="mt-1 block text-sm text-muted-foreground"
              >
                {formatDateTime(published.publishedAt)}
              </time>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
