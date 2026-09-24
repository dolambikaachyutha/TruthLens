"use client";

import { InfoIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RiskLevelBadge } from "@/components/claims/badges";
import {
  RISK_FLAG_DISCLAIMER,
  PRESENTATION_SIGNALS_DISCLAIMER,
  SEVERITY_META,
} from "@/lib/meta";
import type { RiskFlag, RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RiskAnalysisPanelProps {
  engaged: boolean;
  flags: RiskFlag[];
  riskLevel: RiskLevel;
  uppercaseRatioPercent: number;
}

/**
 * Live risk-analysis panel shown inline in the claim submission form.
 *
 * Accessibility notes:
 * - The outer <section> is labelled with aria-label for landmark navigation.
 * - A visually hidden <div aria-live="polite" aria-atomic="true"> announces
 *   flag count changes to screen readers without exposing the full repetitive
 *   flag list on every keystroke. This avoids both "nothing announced" and
 *   "every character triggers a wall of speech" problems.
 * - Individual flag pills use <li> inside a real <ul>.
 * - Reduced-motion: Motion animations are instant when prefers-reduced-motion
 *   is active.
 * - Flags are NEVER presented as truth judgments (AGENTS.md).
 */
export function RiskAnalysisPanel({
  engaged,
  flags,
  riskLevel,
  uppercaseRatioPercent,
}: RiskAnalysisPanelProps) {
  const reduceMotion = useReducedMotion();

  /* Polite announcement — concise enough not to overwhelm screen reader users. */
  const announcement = !engaged
    ? ""
    : flags.length === 0
      ? "No triage signals detected."
      : `${flags.length} triage signal${flags.length === 1 ? "" : "s"} detected. Risk level: ${riskLevel}.`;

  return (
    <section
      aria-label="Live triage signal analysis"
      className="rounded-xl border border-border bg-muted/40 p-4 sm:p-5"
    >
      {/* Screen-reader-only live region — announces summary only, not full flag list */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="risk-panel-live-region"
      >
        {announcement}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-sm font-normal text-navy">
          Presentation signals
        </h2>
        {engaged && <RiskLevelBadge level={riskLevel} />}
      </div>

      {!engaged ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Enter the claim text to run triage checks for credential-harvesting
          and social-engineering keywords, financial pressure, urgency threats,
          legal-action threats, sensational language, shouting, and missing
          sources.
        </p>
      ) : flags.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          No triage signals detected for this text yet.
        </p>
      ) : (
        <ul
          aria-label={`${flags.length} triage signal${flags.length === 1 ? "" : "s"} detected`}
          className="mt-3 space-y-2.5"
        >
          <AnimatePresence initial={false}>
            {flags.map((flag) => {
              const severity = SEVERITY_META[flag.severity];
              return (
                <motion.li
                  key={flag.code}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{
                    duration: reduceMotion ? 0.01 : 0.22,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex flex-col gap-1 sm:flex-row sm:gap-3"
                >
                  <span
                    className={cn(
                      "inline-flex h-fit w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                      severity.chipClass
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("size-1.5 rounded-full", severity.dotClass)}
                    />
                    {flag.label}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {flag.rationale}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {engaged && (
        <p
          className="mt-3 text-xs text-muted-foreground tabular-nums"
          aria-label={`Uppercase letter ratio: ${uppercaseRatioPercent} percent. Shouting is detected above 50 percent.`}
        >
          Uppercase letters: {uppercaseRatioPercent}% · Shouting threshold: 50%
        </p>
      )}

      <p className="mt-3 flex gap-2 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
        <InfoIcon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-cyan-deep" />
        <span>
          {PRESENTATION_SIGNALS_DISCLAIMER} {RISK_FLAG_DISCLAIMER} Flags never
          label a claim true or false.
        </span>
      </p>
    </section>
  );
}
