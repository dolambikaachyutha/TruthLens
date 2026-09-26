"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CalendarIcon,
  ClipboardCheckIcon,
  ExternalLinkIcon,
  FlagIcon,
  QuoteIcon,
  ThumbsUpIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  CategoryBadge,
  RiskLevelBadge,
  StatusBadge,
} from "@/components/claims/badges";
import { CommunityReviewDialog } from "@/components/claims/community-review-dialog";
import { CommunityReviewsPanel } from "@/components/claims/community-reviews-panel";
import { HistoryTimeline } from "@/components/claims/history-timeline";
import { HumanReviewPanel } from "@/components/claims/human-review-panel";
import { RiskFlagList } from "@/components/claims/risk-flag-list";
import { CopyClaimTextButton } from "@/components/shared/copy-claim-text-button";
import { CopyLinkButton } from "@/components/shared/copy-link-button";
import { EmptyState, ErrorState } from "@/components/states/state-panels";
import { DetailSkeleton } from "@/components/states/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClaim, useSharedFeedStatus } from "@/hooks/use-claims";
import { useHydrated } from "@/hooks/use-hydrated";
import { addCorrection, hasVotedSameClaim, voteSameClaim } from "@/lib/claim-store";
import { DeleteClaimButton } from "@/components/claims/delete-claim-button";
import { formatDateTime, timeAgo } from "@/lib/format";
import {
  EVIDENCE_STRENGTH_META,
  REVIEW_CONFIDENCE_META,
  STATUS_META,
} from "@/lib/meta";

export function ClaimDetail({ id }: { id: string }) {
  const claim = useClaim(id);
  const { status: feedStatus, retry } = useSharedFeedStatus();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  const [sameVoted, setSameVoted] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const sameCount = claim?.sameClaimCount ?? 0;
  const alreadyVoted =
    sameVoted || (claim ? hasVotedSameClaim(claim.id) : false);

  function handleSameClaimVote() {
    if (!claim || alreadyVoted) return;
    const updated = voteSameClaim(claim.id);
    if (updated) {
      setSameVoted(true);
      toast.success("Marked as the same claim.", {
        description: "This is a public signal — not a truth judgment.",
      });
    }
  }

  function submitReport() {
    if (!claim) return;
    const reason = reportReason.trim();
    if (reason.length < 15) {
      toast.error("Describe the problem in at least 15 characters.");
      return;
    }
    const url = reportUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      toast.error("Evidence URL must start with http:// or https://.");
      return;
    }
    addCorrection(claim.id, {
      reason,
      evidenceUrl: url || null,
      submittedBy: "Public report",
    });
    setReportReason("");
    setReportUrl("");
    setReportOpen(false);
    toast.success("Problem report recorded.", {
      description: "Original claim text and review history are unchanged.",
    });
  }

  if (!hydrated || (feedStatus === "loading" && !claim)) {
    return (
      <div className="container-page py-10 sm:py-14">
        <DetailSkeleton />
      </div>
    );
  }

  if (feedStatus === "error" && !claim) {
    return (
      <div className="container-page py-10 sm:py-14">
        <ErrorState
          title="Shared feed unavailable"
          description="We could not reach the shared claim store, so this claim cannot be confirmed right now. Nothing is stored only in this browser — try again in a moment."
          onRetry={retry}
        />
        <div className="mt-4 text-center">
          <Link
            href="/feed"
            className="text-sm font-medium text-cyan-deep underline-offset-4 hover:underline"
          >
            Back to public feed
          </Link>
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="container-page py-10 sm:py-14">
        <ErrorState
          title="Claim not found"
          description="This claim may have been removed from the public feed, or the shared store is not reachable right now."
          onRetry={() => window.location.reload()}
        />
        <div className="mt-4 text-center">
          <Link
            href="/feed"
            className="text-sm font-medium text-cyan-deep underline-offset-4 hover:underline"
          >
            Back to public feed
          </Link>
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_META[claim.claimStatus];
  const findings = [...claim.reviewHistory]
    .filter(
      (entry) =>
        entry.action === "status_change" || entry.action === "verdict_published"
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const evidenceNotes = claim.reviewHistory.filter(
    (entry) => entry.action === "evidence_note"
  );
  const published = claim.publishedReview;

  return (
    <div className="container-page py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-6">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-navy focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          Back to public feed
        </Link>
      </nav>

      <motion.header
        className="max-w-3xl"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={claim.claimStatus} />
          <CategoryBadge category={claim.category} />
          <RiskLevelBadge level={claim.riskLevel} />
          {!published && claim.claimStatus === "unverified" && (
            <span className="text-[11px] font-medium text-muted-foreground">
              Awaiting human review
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 rounded-full border border-cyan-signal/30 bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground tabular-nums"
            data-testid="detail-same-claim-count"
          >
            <ThumbsUpIcon aria-hidden className="size-3" />
            {sameCount} same claim{sameCount === 1 ? "" : "s"}
          </span>
        </div>
        <h1 className="mt-4 font-heading text-3xl leading-tight font-normal tracking-tight text-foreground sm:text-4xl">
          {claim.title}
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon aria-hidden className="size-3.5" />
            Submitted {formatDateTime(claim.submittedAt)}
          </span>
          <span className="tabular-nums" title={formatDateTime(claim.updatedAt)}>
            Last updated {timeAgo(claim.updatedAt)}
          </span>
          <span className="tabular-nums">ID {claim.id}</span>
          <CopyClaimTextButton title={claim.title} body={claim.body} />
          <CopyLinkButton claimId={claim.id} />
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleSameClaimVote}
            disabled={alreadyVoted}
            data-testid="detail-same-claim-vote"
            className={
              alreadyVoted
                ? "h-9 cursor-default rounded-full border border-cyan-signal/40 bg-accent px-4 text-accent-foreground"
                : "h-9 rounded-full border border-border bg-background px-4 text-foreground hover:bg-accent"
            }
          >
            <ThumbsUpIcon aria-hidden className="size-4" />
            {alreadyVoted ? "Same claim marked" : "Same claim — I wanted to post this"}
          </Button>
          {!claim.isDeleted && (
            <Button
              type="button"
              onClick={() => setReviewDialogOpen(true)}
              data-testid="detail-add-review"
              className="h-9 rounded-full border border-teal-300 bg-teal-50 px-4 text-teal-900 hover:bg-teal-100"
            >
              <UsersIcon aria-hidden className="size-4" />
              {(claim.communityReviews?.length ?? 0) > 0
                ? "Add another review"
                : "Add independent review"}
            </Button>
          )}
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Marks that you saw this claim too. Not a truth judgment — original
            text and review history stay unchanged. Independent reviews let
            other reviewers record their own assessments without publishing an
            official verdict.
          </p>
          {/* Delete only while unverified/in-review and not already deleted.
              Published verdicts cannot be deleted (DP3). */}
          {!claim.isDeleted &&
            (claim.claimStatus === "unverified" ||
              claim.claimStatus === "in_review") && (
              <div className="ml-auto">
                <DeleteClaimButton claimId={claim.id} />
              </div>
            )}
          {claim.isDeleted && (
            <p className="ml-auto text-xs font-medium text-red-700" data-testid="detail-deleted-banner">
              Removed from the public feed (public demo delete). Original text kept for audit.
            </p>
          )}
        </div>
      </motion.header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <section
            aria-labelledby="original-heading"
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <QuoteIcon aria-hidden className="size-4 text-cyan-deep" />
              <h2
                id="original-heading"
                className="font-heading text-base font-normal text-navy"
              >
                Original claim — preserved as submitted
              </h2>
            </div>
            <p className="mt-4 border-l-4 border-cyan-signal/60 pl-4 text-base leading-relaxed text-navy/90">
              {claim.body}
            </p>
            {claim.sourceUrl && (
              <a
                href={claim.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-deep underline-offset-4 transition-colors hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                Linked source
                <ExternalLinkIcon aria-hidden className="size-3.5" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
            <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Platform
                </dt>
                <dd className="mt-0.5 text-navy">{claim.platform ?? "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Category
                </dt>
                <dd className="mt-0.5 capitalize text-navy">{claim.category}</dd>
              </div>
            </dl>
          </section>

          <HumanReviewPanel claim={claim} />

          <CommunityReviewsPanel claim={claim} />

          {published && (
            <section
              aria-labelledby="analysis-heading"
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
              data-testid="published-analysis"
            >
              <div className="flex items-center gap-2">
                <ClipboardCheckIcon aria-hidden className="size-4 text-cyan-deep" />
                <h2
                  id="analysis-heading"
                  className="font-heading text-base font-normal text-navy"
                >
                  Review analysis
                </h2>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${EVIDENCE_STRENGTH_META[published.evidenceStrength].badgeClass}`}
                  data-testid="detail-evidence-strength"
                >
                  Evidence:{" "}
                  {EVIDENCE_STRENGTH_META[published.evidenceStrength].label}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${REVIEW_CONFIDENCE_META[published.confidence].badgeClass}`}
                  data-testid="detail-review-confidence"
                >
                  Confidence:{" "}
                  {REVIEW_CONFIDENCE_META[published.confidence].label}
                </span>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-semibold text-navy">Claim interpretation</dt>
                  <dd className="mt-1 text-foreground/90">
                    {published.claimInterpretation}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-navy">
                    Supporting evidence analysis
                  </dt>
                  <dd className="mt-1 text-foreground/90">
                    {published.supportingAnalysis}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-navy">
                    Contradicting evidence analysis
                  </dt>
                  <dd className="mt-1 text-foreground/90">
                    {published.contradictingAnalysis}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-navy">
                    Date, location, and scope analysis
                  </dt>
                  <dd className="mt-1 text-foreground/90">
                    {published.contextAnalysis}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          <section
            aria-labelledby="findings-heading"
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <h2
              id="findings-heading"
              className="font-heading text-base font-normal text-navy"
            >
              Reviewer findings
            </h2>
            {findings || claim.publishedReview ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={claim.publishedReview?.verdict ?? claim.claimStatus}
                  />
                  <span className="text-xs text-muted-foreground">
                    {(claim.publishedReview?.reviewerLabel ??
                      findings?.author ??
                      "Community reviewer")}{" "}
                    ·{" "}
                    {formatDateTime(
                      claim.publishedReview?.publishedAt ??
                        findings?.createdAt ??
                        claim.submittedAt
                    )}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  {claim.publishedReview?.note ?? findings?.note}
                </p>
              </>
            ) : (
              <div className="mt-3">
                <EmptyState
                  title="Awaiting human review"
                  description="No final verdict exists yet. Automated evidence is shown above — signals are not a verdict. Status remains Unverified."
                />
              </div>
            )}
          </section>

          <section aria-labelledby="evidence-heading">
            <div className="mb-3 flex items-center gap-2">
              <BookOpenIcon aria-hidden className="size-4 text-cyan-deep" />
              <h2
                id="evidence-heading"
                className="font-heading text-base font-normal text-navy"
              >
                Evidence notes
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {evidenceNotes.length} note
                {evidenceNotes.length === 1 ? "" : "s"}
              </span>
            </div>
            {evidenceNotes.length > 0 ? (
              <ul className="space-y-3">
                {evidenceNotes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-xl border border-border bg-card p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-navy">
                        {note.author}
                      </span>
                      <span aria-hidden>·</span>
                      <time dateTime={note.createdAt}>
                        {formatDateTime(note.createdAt)}
                      </time>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                      {note.note}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
                No evidence notes recorded yet. Reviewers append sources here
                without ever editing the original claim text.
              </p>
            )}
          </section>

          <section
            aria-labelledby="signals-heading"
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2
                  id="signals-heading"
                  className="font-heading text-base font-normal text-navy"
                >
                  Presentation signals
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pattern detection only — review priority, never a verdict.
                </p>
              </div>
              <RiskLevelBadge level={claim.riskLevel} />
            </div>
            <RiskFlagList flags={claim.riskFlags} />
          </section>

          <section
            aria-labelledby="corrections-heading"
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FlagIcon aria-hidden className="size-4 text-cyan-deep" />
                <h2
                  id="corrections-heading"
                  className="font-heading text-base font-normal text-navy"
                >
                  Corrections &amp; problem reports
                </h2>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() => setReportOpen((open) => !open)}
                data-testid="report-problem-toggle"
              >
                Report a problem
              </Button>
            </div>

            {reportOpen && (
              <div
                className="mt-4 space-y-3 rounded-lg border border-border bg-muted/40 p-4"
                data-testid="report-problem-form"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="report-reason" className="text-navy">
                    What is wrong with this record?
                  </Label>
                  <Textarea
                    id="report-reason"
                    rows={3}
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                    placeholder="Describe the issue (min 15 characters)…"
                    data-testid="report-reason"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="report-url" className="text-navy">
                    Supporting URL{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="report-url"
                    type="url"
                    value={reportUrl}
                    onChange={(event) => setReportUrl(event.target.value)}
                    placeholder="https://…"
                    data-testid="report-url"
                  />
                </div>
                <Button
                  type="button"
                  className="h-9 bg-navy font-semibold text-white hover:bg-navy-deep"
                  onClick={submitReport}
                  data-testid="report-submit"
                >
                  Submit problem report
                </Button>
              </div>
            )}

            {claim.corrections.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No corrections recorded for this claim.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {claim.corrections.map((correction) => (
                  <li
                    key={correction.id}
                    className="rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-navy">
                        {correction.submittedBy}
                      </span>
                      <span>· {formatDateTime(correction.createdAt)}</span>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 uppercase">
                        {correction.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/90">
                      {correction.reason}
                    </p>
                    {correction.evidenceUrl && (
                      <a
                        href={correction.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-cyan-deep hover:underline"
                      >
                        {correction.evidenceUrl}
                        <ExternalLinkIcon aria-hidden className="size-3" />
                      </a>
                    )}
                    {correction.response && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Response: {correction.response}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/feed"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-navy focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <ArrowLeftIcon aria-hidden className="size-4" />
              Back to claims feed
            </Link>
          </div>
        </div>

        <aside
          aria-label="Claim history"
          className="space-y-6 lg:sticky lg:top-24 lg:self-start"
        >
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-heading text-base font-normal text-navy">
              What this status means
            </h2>
            <div className="mt-3 flex items-start gap-3">
              <StatusBadge
                status={claim.claimStatus}
                className="mt-0.5 shrink-0"
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                {statusMeta.description}
              </p>
            </div>
            <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
              Statuses are recorded by human reviewers against traceable
              evidence. Risk signals never assign a status.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <HistoryTimeline history={claim.reviewHistory} />
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href="/submit"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Submit a related claim
            </Link>
            <Link
              href="/review"
              className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Open the reviewer workspace
            </Link>
          </div>
        </aside>
      </div>

      <CommunityReviewDialog
        claim={claim}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
      />
    </div>
  );
}
