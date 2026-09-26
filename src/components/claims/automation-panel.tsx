"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangleIcon,
  ArchiveIcon,
  BotIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
  SearchIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AUTOMATION_STATUS_META,
  EVIDENCE_STATUS_META,
  INTAKE_STATUS_META,
  RISK_LEVEL_META,
} from "@/lib/meta";
import { AUTOMATION_DISCLAIMER } from "@/lib/automation";
import type { Claim } from "@/lib/types";
import { cn } from "@/lib/utils";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const KIND_ICONS: Record<string, typeof BotIcon> = {
  claim_format: FileTextIcon,
  spam_abuse_pii: ShieldAlertIcon,
  presentation_signals: ShieldAlertIcon,
  duplicate_claims: CopyIcon,
  source_reachability: CircleDashedIcon,
  source_metadata: SearchIcon,
  wayback_archive: ArchiveIcon,
  fact_check_search: SearchIcon,
  similar_claims: SearchIcon,
};

export function AutomationPanel({
  claim,
  onRetry,
  busy,
}: {
  claim: Claim;
  onRetry?: () => void;
  busy?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const statusMeta = AUTOMATION_STATUS_META[claim.automationStatus];
  const intakeMeta = INTAKE_STATUS_META[claim.intakeStatus];
  const isProcessing =
    busy ||
    claim.automationStatus === "running" ||
    claim.automationStatus === "queued" ||
    claim.automationStatus === "not_started";

  const jobs = useMemo(() => claim.evidence, [claim.evidence]);

  return (
    <section
      aria-labelledby="automation-heading"
      className="rounded-xl border border-border bg-card p-6 shadow-sm"
      data-testid="automation-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground ring-1 ring-cyan-signal/30">
            <BotIcon aria-hidden className="size-4 text-cyan-deep" />
          </span>
          <div>
            <h2
              id="automation-heading"
              className="font-heading text-base font-normal text-navy"
            >
              Automated evidence desk
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Presentation signals, source checks, archives, and related
              references — organized for review.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            data-testid="automation-status"
            className={cn(
              "gap-1.5 px-2.5 text-[11px] font-semibold uppercase",
              statusMeta.badgeClass
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                statusMeta.dotClass,
                isProcessing && "animate-pulse"
              )}
            />
            {isProcessing ? "Processing" : statusMeta.label}
          </Badge>
          <Badge
            variant="outline"
            data-testid="intake-status"
            className={cn(
              "gap-1.5 px-2.5 text-[11px] font-semibold uppercase",
              intakeMeta.badgeClass
            )}
          >
            <span
              aria-hidden
              className={cn("size-1.5 rounded-full", intakeMeta.dotClass)}
            />
            Intake: {intakeMeta.label}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "px-2.5 text-[11px] font-semibold uppercase",
              RISK_LEVEL_META[claim.riskLevel].badgeClass
            )}
          >
            {claim.riskLevel === "high"
              ? RISK_LEVEL_META.high.priorityLabel
              : RISK_LEVEL_META[claim.riskLevel].label}
          </Badge>
        </div>
      </div>

      <p
        role="status"
        className="mt-3 text-sm leading-relaxed text-muted-foreground"
        data-testid="automation-description"
      >
        {isProcessing
          ? "Gathering evidence records…"
          : statusMeta.description}
      </p>

      {claim.automationStatus === "failed" && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/70 px-3.5 py-3 text-sm text-red-800"
          data-testid="automation-failure"
        >
          <AlertTriangleIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Evidence gathering failed</p>
            <p className="mt-0.5 text-xs leading-relaxed text-red-700/90">
              Partial or missing automated records. A human reviewer can still
              open this claim. Status remains Unverified.
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="ml-2 font-semibold underline underline-offset-2"
                >
                  Retry automation
                </button>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-2.5" data-testid="automation-jobs">
        <AnimatePresence initial={false}>
          {jobs.map((job) => {
            const icon = KIND_ICONS[job.kind] ?? BotIcon;
            const statusMetaJob = EVIDENCE_STATUS_META[job.status];
            const Icon = icon;
            return (
              <motion.article
                key={job.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{
                  duration: reduceMotion ? 0.01 : 0.32,
                  ease: EASE_OUT,
                }}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-3.5 py-3"
                data-testid={`evidence-job-${job.kind}`}
              >
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-cyan-deep" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-navy">
                      {job.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-2 text-[10px] font-semibold uppercase",
                        statusMetaJob.chipClass
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-1.5 rounded-full",
                          statusMetaJob.dotClass
                        )}
                      />
                      {statusMetaJob.label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {job.summary}
                  </p>
                  {job.detail && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">
                      {job.detail}
                    </p>
                  )}
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-cyan-deep underline-offset-4 hover:underline"
                    >
                      Open reference
                      <ExternalLinkIcon aria-hidden className="size-3" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  )}
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>

        {isProcessing && jobs.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3.5 py-4 text-sm text-muted-foreground">
            <CircleDashedIcon
              aria-hidden
              className="size-4 animate-spin text-cyan-deep"
            />
            Starting evidence jobs…
          </div>
        )}

        {!isProcessing && jobs.length === 0 && claim.automationStatus !== "failed" && (
          <p className="rounded-lg border border-dashed border-border px-3.5 py-4 text-sm text-muted-foreground">
            No automated evidence records yet.
          </p>
        )}
      </div>

      {claim.publishedReview == null && (
        <p className="mt-5 flex gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          <CheckCircle2Icon
            aria-hidden
            className="mt-0.5 size-3.5 shrink-0 text-cyan-deep"
          />
          <span data-testid="automation-disclaimer">{AUTOMATION_DISCLAIMER}</span>
        </p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Need the public view?{" "}
        <Link
          href="/review"
          className="font-medium text-cyan-deep underline-offset-4 hover:underline"
        >
          Open the reviewer workspace
        </Link>
      </p>
    </section>
  );
}
