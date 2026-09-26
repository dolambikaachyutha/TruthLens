"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ExternalLinkIcon,
  FileTextIcon,
  PlusIcon,
  QuoteIcon,
  ScaleIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  CategoryBadge,
  RiskLevelBadge,
  StatusBadge,
} from "@/components/claims/badges";
import { HistoryTimeline } from "@/components/claims/history-timeline";
import { RiskFlagList } from "@/components/claims/risk-flag-list";
import { EmptyState } from "@/components/states/state-panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClaims } from "@/hooks/use-claims";
import { useReviewActions } from "@/hooks/use-review-actions";
import {
  COMMUNITY_REVIEWER,
  HUMAN_REVIEW_MESSAGE,
  MIN_ANALYSIS_FIELD_LENGTH,
  MIN_REVIEW_NOTE_LENGTH,
} from "@/lib/automation";
import { formatDate } from "@/lib/format";
import {
  EVIDENCE_STRENGTH_META,
  REVIEW_CONFIDENCE_META,
} from "@/lib/meta";
import type {
  Claim,
  ClaimStatus,
  EvidenceStrength,
  ReviewConfidence,
  Verdict,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type QueueTab = "triage" | "active" | "assessed";

const ASSESSED: ClaimStatus[] = ["verified_true", "verified_false", "misleading"];

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const verdictActions: {
  verdict: Verdict;
  label: string;
  className: string;
  hint: string;
}[] = [
  {
    verdict: "verified_true",
    label: "Publish Verified True",
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    hint: "Claim matches the evidence you reviewed.",
  },
  {
    verdict: "verified_false",
    label: "Publish Verified False",
    className: "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
    hint: "Claim is contradicted by the evidence you reviewed.",
  },
  {
    verdict: "misleading",
    label: "Publish Misleading",
    className: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
    hint: "Missing context distorts the claim.",
  },
];

const strengthOptions = Object.entries(EVIDENCE_STRENGTH_META) as [
  EvidenceStrength,
  (typeof EVIDENCE_STRENGTH_META)[EvidenceStrength],
][];

const confidenceOptions = Object.entries(REVIEW_CONFIDENCE_META) as [
  ReviewConfidence,
  (typeof REVIEW_CONFIDENCE_META)[ReviewConfidence],
][];

function tabMatches(tab: QueueTab, claim: Claim): boolean {
  if (claim.isDeleted) return false;
  if (tab === "triage") return claim.claimStatus === "unverified";
  if (tab === "active") return claim.claimStatus === "in_review";
  return ASSESSED.includes(claim.claimStatus);
}

export function ReviewWorkspace() {
  const claims = useClaims();
  const { startReview, publishVerdict, appendEvidenceNote, busy } =
    useReviewActions();
  const [tab, setTab] = useState<QueueTab>("triage");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [extraUrls, setExtraUrls] = useState<string[]>([]);
  const [claimInterpretation, setClaimInterpretation] = useState("");
  const [supportingAnalysis, setSupportingAnalysis] = useState("");
  const [contradictingAnalysis, setContradictingAnalysis] = useState("");
  const [contextAnalysis, setContextAnalysis] = useState("");
  const [evidenceStrength, setEvidenceStrength] =
    useState<EvidenceStrength>("moderate");
  const [confidence, setConfidence] = useState<ReviewConfidence>("medium");
  const [dateChecked, setDateChecked] = useState(false);
  const [locationChecked, setLocationChecked] = useState(false);
  const [scopeChecked, setScopeChecked] = useState(false);
  const reduceMotion = useReducedMotion();

  const queue = useMemo(
    () =>
      claims
        .filter((claim) => tabMatches(tab, claim))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [claims, tab]
  );

  const selected = useMemo(() => {
    if (selectedId) {
      const byId = claims.find((claim) => claim.id === selectedId);
      if (byId) return byId;
    }
    if (!queue.length) return null;
    return queue[0];
  }, [claims, queue, selectedId]);

  const activeClaims = claims.filter((c) => !c.isDeleted);
  const tabCounts = {
    triage: activeClaims.filter((c) => c.claimStatus === "unverified").length,
    active: activeClaims.filter((c) => c.claimStatus === "in_review").length,
    assessed: activeClaims.filter((c) => ASSESSED.includes(c.claimStatus)).length,
  };

  function resetComposer() {
    setNote("");
    setEvidenceUrl("");
    setExtraUrls([]);
    setClaimInterpretation("");
    setSupportingAnalysis("");
    setContradictingAnalysis("");
    setContextAnalysis("");
    setEvidenceStrength("moderate");
    setConfidence("medium");
    setDateChecked(false);
    setLocationChecked(false);
    setScopeChecked(false);
  }

  function onStartReview() {
    if (!selected) return;
    const next = startReview(selected.id);
    if (next) resetComposer();
  }

  function onPublish(verdict: Verdict) {
    if (!selected) return;
    const urls = [evidenceUrl, ...extraUrls].filter((u) => u.trim());
    const next = publishVerdict(selected.id, {
      note,
      evidenceUrls: urls,
      verdict,
      claimInterpretation,
      supportingAnalysis,
      contradictingAnalysis,
      contextAnalysis,
      evidenceStrength,
      confidence,
      qualityChecklist: {
        dateChecked,
        locationChecked,
        scopeChecked,
      },
    });
    if (next?.publishedReview) resetComposer();
  }

  function onAppendNote() {
    if (!selected) return;
    const urls = [evidenceUrl, ...extraUrls].filter((u) => u.trim());
    const next = appendEvidenceNote(selected.id, note, urls);
    if (next) resetComposer();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section
        aria-label="Review queue"
        className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <div className="border-b border-border px-4 pt-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-heading text-base font-normal text-navy">
              Queue
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {queue.length} claim{queue.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Public demo review workspace · {COMMUNITY_REVIEWER}
          </p>
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value as QueueTab);
              setSelectedId(null);
            }}
          >
            <TabsList variant="line" className="w-full justify-start">
              <TabsTrigger value="triage" className="gap-1.5">
                Triage
                <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
                  {tabCounts.triage}
                </span>
              </TabsTrigger>
              <TabsTrigger value="active" className="gap-1.5">
                Active
                <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
                  {tabCounts.active}
                </span>
              </TabsTrigger>
              <TabsTrigger value="assessed" className="gap-1.5">
                Assessed
                <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
                  {tabCounts.assessed}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {queue.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={claims.length === 0 ? "No claims yet" : "Queue clear"}
              description={
                claims.length === 0
                  ? "Nothing has been submitted yet. Submitted claims appear here for first-pass triage."
                  : "No claims are waiting in this lane right now. Check another tab."
              }
              actionLabel={claims.length === 0 ? "Submit a claim" : undefined}
              actionHref={claims.length === 0 ? "/submit" : undefined}
            />
          </div>
        ) : (
          <ul className="max-h-[420px] divide-y divide-border overflow-y-auto lg:max-h-[560px]">
            <AnimatePresence initial={false}>
              {queue.map((claim, i) => {
                const isSelected = selected?.id === claim.id;
                return (
                  <motion.li
                    key={claim.id}
                    layout={!reduceMotion}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                    transition={{
                      duration: reduceMotion ? 0.01 : 0.28,
                      ease: EASE_OUT,
                      delay: reduceMotion ? 0 : Math.min(i * 0.04, 0.2),
                      layout: { duration: reduceMotion ? 0 : 0.3, delay: 0 },
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(claim.id);
                        resetComposer();
                      }}
                      aria-pressed={isSelected}
                      className={cn(
                        "w-full px-4 py-3.5 text-left transition-colors outline-none focus-visible:bg-accent/60",
                        isSelected ? "bg-accent/70" : "hover:bg-muted/70"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <StatusBadge status={claim.claimStatus} />
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          {formatDate(claim.updatedAt)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "mt-2 line-clamp-2 text-sm leading-snug font-medium",
                          isSelected ? "text-navy" : "text-navy/85"
                        )}
                      >
                        {claim.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {claim.category} · {claim.riskFlags.length} signals
                      </p>
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </section>

      <section
        aria-label="Review panel"
        className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          {!selected ? (
            <motion.div
              key="empty"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <EmptyState
                icon={<FileTextIcon aria-hidden className="size-6" />}
                title={claims.length === 0 ? "Queue empty" : "Nothing selected"}
                description={
                  claims.length === 0
                    ? "The queue is empty. Submitted claims will appear here to review."
                    : "Choose a claim from the queue to read its original text, signals, and history."
                }
              />
            </motion.div>
          ) : (
            <motion.div
              key={selected.id}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.24, ease: EASE_OUT }}
              className="flex flex-col gap-5"
            >
              <header className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.claimStatus} />
                  <CategoryBadge category={selected.category} />
                  <RiskLevelBadge level={selected.riskLevel} />
                  <Link
                    href={`/claims/${selected.id}`}
                    className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-cyan-deep transition-colors hover:text-navy focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    Public view
                    <ExternalLinkIcon aria-hidden className="size-3" />
                  </Link>
                </div>
                <h2 className="font-heading text-xl leading-snug font-normal text-navy sm:text-2xl">
                  {selected.title}
                </h2>
              </header>

              <blockquote className="flex gap-2.5 rounded-lg border border-border bg-muted/50 p-4 text-sm leading-relaxed text-navy/90">
                <QuoteIcon aria-hidden className="mt-1 size-4 shrink-0 text-cyan-deep" />
                <span>{selected.body}</span>
              </blockquote>

              <div className="rounded-lg border border-border p-4">
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  Risk signals help prioritize review. They are not factual verdicts.
                </p>
                <RiskFlagList flags={selected.riskFlags} />
              </div>

              <div
                className="rounded-lg border border-border p-4"
                data-testid="publish-review-form"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <ScaleIcon aria-hidden className="size-4 text-cyan-deep" />
                    Human review — {COMMUNITY_REVIEWER}
                  </h3>
                  {selected.publishedReview && (
                    <span
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 uppercase"
                      data-testid="published-badge"
                    >
                      Verdict published
                    </span>
                  )}
                </div>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  {HUMAN_REVIEW_MESSAGE}
                </p>

                {selected.claimStatus === "unverified" &&
                  !selected.publishedReview && (
                    <Button
                      type="button"
                      onClick={onStartReview}
                      className="mb-4 h-9 w-full border-blue-200 bg-blue-50 font-semibold text-blue-700 hover:bg-blue-100"
                      data-testid="start-review"
                    >
                      Start review (sets In Review)
                    </Button>
                  )}

                <div className="space-y-1.5">
                  <Label htmlFor="claim-interpretation" className="text-navy">
                    Claim interpretation{" "}
                    <span className="text-muted-foreground font-normal">
                      (min {MIN_ANALYSIS_FIELD_LENGTH} characters)
                    </span>
                  </Label>
                  <Textarea
                    id="claim-interpretation"
                    rows={2}
                    value={claimInterpretation}
                    onChange={(event) => setClaimInterpretation(event.target.value)}
                    placeholder="Restate what the claim asserts, including date, place, and scope…"
                    disabled={Boolean(selected.publishedReview)}
                    data-testid="claim-interpretation"
                  />
                </div>

                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="supporting-analysis" className="text-navy">
                    Supporting evidence analysis
                  </Label>
                  <Textarea
                    id="supporting-analysis"
                    rows={2}
                    value={supportingAnalysis}
                    onChange={(event) => setSupportingAnalysis(event.target.value)}
                    placeholder="What evidence supports the claim? Cite sources…"
                    disabled={Boolean(selected.publishedReview)}
                    data-testid="supporting-analysis"
                  />
                </div>

                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="contradicting-analysis" className="text-navy">
                    Contradicting evidence analysis
                  </Label>
                  <Textarea
                    id="contradicting-analysis"
                    rows={2}
                    value={contradictingAnalysis}
                    onChange={(event) =>
                      setContradictingAnalysis(event.target.value)
                    }
                    placeholder="What evidence contradicts or complicates the claim?…"
                    disabled={Boolean(selected.publishedReview)}
                    data-testid="contradicting-analysis"
                  />
                </div>

                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="context-analysis" className="text-navy">
                    Date, location, and scope analysis
                  </Label>
                  <Textarea
                    id="context-analysis"
                    rows={2}
                    value={contextAnalysis}
                    onChange={(event) => setContextAnalysis(event.target.value)}
                    placeholder="Check when and where this applies, and what it covers…"
                    disabled={Boolean(selected.publishedReview)}
                    data-testid="context-analysis"
                  />
                </div>

                <fieldset
                  className="mt-4 rounded-lg border border-border bg-muted/40 p-3"
                  data-testid="quality-checklist"
                >
                  <legend className="px-1 text-xs font-semibold text-navy">
                    Quality checklist
                  </legend>
                  <label className="flex items-start gap-2 text-sm text-foreground/90">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-navy"
                      checked={dateChecked}
                      onChange={(event) => setDateChecked(event.target.checked)}
                      disabled={Boolean(selected.publishedReview)}
                      data-testid="checklist-date"
                    />
                    I checked the date context of this claim.
                  </label>
                  <label className="mt-2 flex items-start gap-2 text-sm text-foreground/90">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-navy"
                      checked={locationChecked}
                      onChange={(event) => setLocationChecked(event.target.checked)}
                      disabled={Boolean(selected.publishedReview)}
                      data-testid="checklist-location"
                    />
                    I checked the location context of this claim.
                  </label>
                  <label className="mt-2 flex items-start gap-2 text-sm text-foreground/90">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-navy"
                      checked={scopeChecked}
                      onChange={(event) => setScopeChecked(event.target.checked)}
                      disabled={Boolean(selected.publishedReview)}
                      data-testid="checklist-scope"
                    />
                    I checked the scope (who/what it covers) of this claim.
                  </label>
                </fieldset>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="evidence-strength" className="text-navy">
                      Evidence strength
                    </Label>
                    <select
                      id="evidence-strength"
                      value={evidenceStrength}
                      onChange={(event) =>
                        setEvidenceStrength(
                          event.target.value as EvidenceStrength
                        )
                      }
                      disabled={Boolean(selected.publishedReview)}
                      data-testid="evidence-strength"
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {strengthOptions.map(([value, meta]) => (
                        <option key={value} value={value}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="review-confidence" className="text-navy">
                      Review confidence
                    </Label>
                    <select
                      id="review-confidence"
                      value={confidence}
                      onChange={(event) =>
                        setConfidence(event.target.value as ReviewConfidence)
                      }
                      disabled={Boolean(selected.publishedReview)}
                      data-testid="review-confidence"
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {confidenceOptions.map(([value, meta]) => (
                        <option key={value} value={value}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="evidence-note" className="text-navy">
                    Reviewer note{" "}
                    <span className="text-muted-foreground font-normal">
                      (min {MIN_REVIEW_NOTE_LENGTH} characters to publish)
                    </span>
                  </Label>
                  <Textarea
                    id="evidence-note"
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Cite what you checked: documents, sources, what matches or contradicts the claim…"
                    className="min-h-20"
                    disabled={Boolean(selected.publishedReview)}
                    data-testid="review-note"
                  />
                </div>

                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="evidence-url" className="text-navy">
                    Evidence URL{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="evidence-url"
                    type="url"
                    inputMode="url"
                    value={evidenceUrl}
                    onChange={(event) => setEvidenceUrl(event.target.value)}
                    placeholder="https://…"
                    disabled={Boolean(selected.publishedReview)}
                    data-testid="evidence-url"
                  />
                  {extraUrls.map((url, index) => (
                    <Input
                      key={`extra-${index}`}
                      type="url"
                      value={url}
                      onChange={(event) =>
                        setExtraUrls((prev) =>
                          prev.map((u, i) =>
                            i === index ? event.target.value : u
                          )
                        )
                      }
                      placeholder="https://…"
                      aria-label={`Additional evidence URL ${index + 1}`}
                      disabled={Boolean(selected.publishedReview)}
                    />
                  ))}
                  {!selected.publishedReview && (
                    <button
                      type="button"
                      onClick={() => setExtraUrls((prev) => [...prev, ""])}
                      className="inline-flex items-center gap-1 text-xs font-medium text-cyan-deep hover:underline"
                    >
                      <PlusIcon aria-hidden className="size-3.5" />
                      Add another evidence URL
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    At least one evidence URL, a {MIN_REVIEW_NOTE_LENGTH}
                    -character note, complete analysis fields, and the quality
                    checklist are required to publish. Original claim text is
                    never modified.
                  </p>
                </div>

                {selected.publishedReview ? (
                  <div
                    className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 text-sm text-emerald-900"
                    data-testid="published-panel"
                  >
                    <p className="font-semibold">
                      Published by {selected.publishedReview.reviewerLabel}
                    </p>
                    <p className="mt-1 text-xs text-emerald-800">
                      {selected.publishedReview.verdict === "verified_true"
                        ? "Verified True"
                        : selected.publishedReview.verdict === "verified_false"
                          ? "Verified False"
                          : "Misleading"}{" "}
                      · evidence strength:{" "}
                      {
                        EVIDENCE_STRENGTH_META[
                          selected.publishedReview.evidenceStrength
                        ].label
                      }{" "}
                      · confidence:{" "}
                      {
                        REVIEW_CONFIDENCE_META[
                          selected.publishedReview.confidence
                        ].label
                      }
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                    {verdictActions.map((action) => (
                      <Button
                        key={action.verdict}
                        type="button"
                        onClick={() => onPublish(action.verdict)}
                        disabled={busy}
                        variant="outline"
                        className={cn(
                          "h-auto w-full flex-col items-start border px-3 py-2.5 font-semibold",
                          action.className
                        )}
                        data-testid={`publish-${action.verdict}`}
                      >
                        <span>{action.label}</span>
                        <span className="text-[11px] font-normal opacity-80">
                          {action.hint}
                        </span>
                      </Button>
                    ))}
                  </div>
                )}

                {!selected.publishedReview && (
                  <Button
                    type="button"
                    onClick={onAppendNote}
                    variant="outline"
                    className="mt-3 h-9 w-full font-semibold"
                    data-testid="append-note"
                  >
                    Append evidence note only
                  </Button>
                )}
              </div>

              <div className="rounded-lg border border-border p-4">
                <HistoryTimeline history={selected.reviewHistory} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

export function reportPublishError(message: string): void {
  toast.error(message);
}
