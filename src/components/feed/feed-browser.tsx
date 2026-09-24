"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FilterXIcon, SearchIcon, XIcon } from "lucide-react";
import { ClaimCard } from "@/components/claims/claim-card";
import { StatusChangeDialog } from "@/components/claims/status-change-dialog";
import { EmptyState } from "@/components/states/state-panels";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClaims } from "@/hooks/use-claims";
import {
  CATEGORY_OPTIONS,
  DATE_FILTER_OPTIONS,
  EVIDENCE_FILTER_OPTIONS,
  PLATFORM_OPTIONS_FILTER,
  RISK_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
} from "@/lib/meta";
import type { Claim, ClaimCategory, ClaimStatus, RiskLevel } from "@/lib/types";
import {
  isIntakeProcessing,
  isVisibleInReviewedFeed,
  isVisibleInUnderReview,
} from "@/lib/visibility";
import { cn } from "@/lib/utils";

type CategoryFilter = ClaimCategory | "all";
type StatusFilter = ClaimStatus | "all";
type RiskFilter = RiskLevel | "all";
type PlatformFilter = string | "all";
type DateFilter = "all" | "24h" | "7d" | "30d";
type EvidenceFilter = "all" | "with_evidence" | "no_evidence";
type SortValue = "same_claim" | "newest" | "oldest" | "updated" | "risk";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const RISK_RANK: Record<RiskLevel, number> = { high: 3, medium: 2, low: 1 };
const DEFAULT_SORT: SortValue = "same_claim";

function withinDateFilter(claim: Claim, dateFilter: DateFilter): boolean {
  if (dateFilter === "all") return true;
  const submitted = new Date(claim.submittedAt).getTime();
  const now = Date.now();
  const hours =
    dateFilter === "24h" ? 24 : dateFilter === "7d" ? 24 * 7 : 24 * 30;
  return now - submitted <= hours * 60 * 60 * 1000;
}

function matchesFilters(
  claim: Claim,
  filters: {
    query: string;
    category: CategoryFilter;
    status: StatusFilter;
    risk: RiskFilter;
    platform: PlatformFilter;
    dateFilter: DateFilter;
    evidence: EvidenceFilter;
  }
): boolean {
  if (claim.isDeleted) return false;
  const normalizedQuery = filters.query.trim().toLowerCase();
  if (filters.category !== "all" && claim.category !== filters.category) {
    return false;
  }
  if (filters.status !== "all" && claim.claimStatus !== filters.status) {
    return false;
  }
  if (filters.risk !== "all" && claim.riskLevel !== filters.risk) {
    return false;
  }
  if (
    filters.platform !== "all" &&
    (claim.platform ?? "other") !== filters.platform
  ) {
    return false;
  }
  if (!withinDateFilter(claim, filters.dateFilter)) return false;
  if (
    filters.evidence === "with_evidence" &&
    claim.automatedEvidenceCount === 0
  ) {
    return false;
  }
  if (
    filters.evidence === "no_evidence" &&
    claim.automatedEvidenceCount > 0
  ) {
    return false;
  }
  if (
    normalizedQuery &&
    !claim.title.toLowerCase().includes(normalizedQuery) &&
    !claim.body.toLowerCase().includes(normalizedQuery)
  ) {
    return false;
  }
  return true;
}

function sortClaims(claims: Claim[], sort: SortValue): Claim[] {
  const list = [...claims];
  switch (sort) {
    case "same_claim":
      return list.sort(
        (a, b) =>
          (b.sameClaimCount ?? 0) - (a.sameClaimCount ?? 0) ||
          b.submittedAt.localeCompare(a.submittedAt)
      );
    case "oldest":
      return list.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    case "updated":
      return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    case "risk":
      return list.sort(
        (a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] ||
          b.submittedAt.localeCompare(a.submittedAt)
      );
    case "newest":
    default:
      return list.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }
}

function ClaimGrid({
  claims,
  onStatusChange,
}: {
  claims: Claim[];
  onStatusChange?: (claim: Claim) => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div layout={!reduceMotion} className="grid gap-5 sm:grid-cols-2">
      <AnimatePresence mode="popLayout" initial={false}>
        {claims.map((claim, index) => (
          <motion.div
            key={claim.id}
            layout={!reduceMotion}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{
              duration: reduceMotion ? 0.01 : 0.3,
              ease: EASE_OUT,
              delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.24),
              layout: { duration: reduceMotion ? 0 : 0.25, delay: 0 },
            }}
          >
            <ClaimCard
              claim={claim}
              index={index}
              onStatusChange={onStatusChange}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

function SelectFilter({
  id,
  label,
  value,
  options,
  onChange,
  testId,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  testId?: string;
}) {
  return (
    <div className="min-w-40 flex-1 space-y-1.5">
      <Label htmlFor={id} className="text-navy">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid={testId}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FeedBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [evidence, setEvidence] = useState<EvidenceFilter>("all");
  const [sort, setSort] = useState<SortValue>(DEFAULT_SORT);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusDialogClaim, setStatusDialogClaim] = useState<Claim | null>(null);
  const claims = useClaims();

  const filterArgs = {
    query,
    category,
    status,
    risk,
    platform,
    dateFilter,
    evidence,
  };

  const filtered = useMemo(() => {
    const matched = claims.filter((claim) => matchesFilters(claim, filterArgs));
    return sortClaims(matched, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    claims,
    query,
    category,
    status,
    risk,
    platform,
    dateFilter,
    evidence,
    sort,
  ]);

  const reviewed = filtered.filter(isVisibleInReviewedFeed);
  const underReview = filtered.filter(isVisibleInUnderReview);
  const processing = filtered.filter(isIntakeProcessing);

  const hasFilters =
    query.trim() !== "" ||
    category !== "all" ||
    status !== "all" ||
    risk !== "all" ||
    platform !== "all" ||
    dateFilter !== "all" ||
    evidence !== "all" ||
    sort !== DEFAULT_SORT;

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setStatus("all");
    setRisk("all");
    setPlatform("all");
    setDateFilter("all");
    setEvidence("all");
    setSort(DEFAULT_SORT);
  }

  function openStatusDialog(claim: Claim) {
    setStatusDialogClaim(claim);
    setStatusDialogOpen(true);
  }

  function handleStatusChanged(updated: Claim) {
    setStatusDialogClaim(updated);
  }

  if (claims.length === 0) {
    return (
      <section aria-label="Claim feed">
        <EmptyState
          title="No claims yet"
          description="The public queue is empty. Submit a claim to see its signals, reviewer notes, and full history here."
          actionLabel="Submit a claim"
          actionHref="/submit"
        />
      </section>
    );
  }

  const totalCount = reviewed.length + underReview.length + processing.length;

  return (
    <section aria-label="Claim feed" className="space-y-8">
      {/* ─── Toolbar ───────────────────────────────────────────────────── */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="space-y-1.5">
          <Label htmlFor="feed-search" className="text-navy">
            Search claims
          </Label>
          <div className="relative">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="feed-search"
              type="text"
              placeholder="Search titles and claim text…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 pr-8 pl-8"
              data-testid="feed-search"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <XIcon aria-hidden className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:gap-3">
          <span className="section-label shrink-0 text-muted-foreground">Status</span>
          <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-0.5">
            {STATUS_OPTIONS.map((option) => (
              <FilterPill
                key={option.value}
                label={option.label}
                active={status === option.value}
                layoutId="feed-status-active"
                onClick={() => setStatus(option.value as StatusFilter)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="section-label shrink-0 text-muted-foreground">
            Category
          </span>
          <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 flex-wrap gap-1.5 px-1 py-0.5">
            {CATEGORY_OPTIONS.map((option) => (
              <FilterPill
                key={option.value}
                label={option.label}
                active={category === option.value}
                layoutId="feed-category-active"
                onClick={() => setCategory(option.value as CategoryFilter)}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-5">
          <SelectFilter
            id="feed-category"
            label="Category"
            value={category}
            options={CATEGORY_OPTIONS}
            onChange={(value) => setCategory(value as CategoryFilter)}
            testId="feed-category"
          />
          <SelectFilter
            id="feed-risk"
            label="Risk"
            value={risk}
            options={RISK_OPTIONS}
            onChange={(value) => setRisk(value as RiskFilter)}
            testId="feed-risk"
          />
          <SelectFilter
            id="feed-platform"
            label="Platform"
            value={platform}
            options={PLATFORM_OPTIONS_FILTER}
            onChange={setPlatform}
            testId="feed-platform"
          />
          <SelectFilter
            id="feed-date"
            label="Date"
            value={dateFilter}
            options={DATE_FILTER_OPTIONS}
            onChange={(value) => setDateFilter(value as DateFilter)}
            testId="feed-date"
          />
          <SelectFilter
            id="feed-evidence"
            label="Evidence status"
            value={evidence}
            options={EVIDENCE_FILTER_OPTIONS}
            onChange={(value) => setEvidence(value as EvidenceFilter)}
            testId="feed-evidence"
          />
        </div>

        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <SelectFilter
            id="feed-sort"
            label="Sort"
            value={sort}
            options={SORT_OPTIONS}
            onChange={(value) => setSort(value as SortValue)}
            testId="feed-sort"
          />
          <div className="flex items-end justify-between gap-3">
            <p
              role="status"
              className="pb-2 text-sm text-muted-foreground tabular-nums"
            >
              Showing {totalCount} of {claims.length} claims
            </p>
            <AnimatePresence initial={false}>
              {hasFilters && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  onClick={clearFilters}
                  data-testid="feed-clear-filters"
                  className="mb-1 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-navy transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <FilterXIcon aria-hidden className="size-4" />
                  Reset filters
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {totalCount === 0 ? (
        <EmptyState
          title="No claims match these filters"
          description="Try a different search term, or reset the filters to see the full public queue."
          actionLabel={hasFilters ? "Reset filters" : undefined}
          onAction={clearFilters}
        />
      ) : (
        <>
          <div className="space-y-4" data-testid="feed-reviewed-section">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold text-foreground">
                Reviewed claims
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {reviewed.length} published verdict
                {reviewed.length === 1 ? "" : "s"}
              </span>
            </div>
            {reviewed.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                No reviewed claims yet. Verdicts appear here only after a
                Community reviewer publishes one with a completed quality
                checklist.
              </p>
            ) : (
              <ClaimGrid claims={reviewed} onStatusChange={openStatusDialog} />
            )}
          </div>

          <div className="space-y-4" data-testid="feed-under-review-section">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold text-foreground">
                Under review
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {underReview.length} open claim
                {underReview.length === 1 ? "" : "s"} · visible to everyone
              </span>
            </div>
            {underReview.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                No claims are waiting for review right now. Every unverified
                claim is public here as soon as it is submitted — they stay
                Unverified until a human publishes a verdict.
              </p>
            ) : (
              <ClaimGrid
                claims={underReview}
                onStatusChange={openStatusDialog}
              />
            )}
          </div>

          {processing.length > 0 && (
            <div className="space-y-4" data-testid="feed-processing-section">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Intake processing
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {processing.length} running
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                These claims are still running automated intake checks. They
                are shown in a clearly labeled processing state — never as
                reviewed claims.
              </p>
              <ClaimGrid
                claims={processing}
                onStatusChange={openStatusDialog}
              />
            </div>
          )}
        </>
      )}

      <StatusChangeDialog
        claim={statusDialogClaim}
        open={statusDialogOpen}
        onOpenChange={(open) => {
          setStatusDialogOpen(open);
          if (!open) setStatusDialogClaim(null);
        }}
        onStatusChanged={handleStatusChanged}
      />
    </section>
  );
}

function FilterPill({
  label,
  active,
  onClick,
  layoutId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  layoutId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative min-h-8 shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active
          ? "border-transparent text-primary-foreground"
          : "border-border text-muted-foreground hover:border-navy/30 hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}
