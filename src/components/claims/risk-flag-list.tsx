"use client";

import { motion, useReducedMotion } from "motion/react";
import { CircleHelpIcon, InfoIcon } from "lucide-react";
import { PRESENTATION_SIGNALS_DISCLAIMER, RISK_FLAG_DISCLAIMER, SEVERITY_META } from "@/lib/meta";
import type { RiskFlag } from "@/lib/types";
import { cn } from "@/lib/utils";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function RiskFlagList({ flags }: { flags: RiskFlag[] }) {
  const reduceMotion = useReducedMotion();

  if (flags.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
        No automated signals were raised for this claim.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {flags.map((flag, i) => {
          const severity = SEVERITY_META[flag.severity];
          return (
            <motion.li
              key={flag.code}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0.01 : 0.3,
                ease: EASE_OUT,
                delay: reduceMotion ? 0 : Math.min(i * 0.06, 0.3),
              }}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5",
                severity.chipClass
              )}
            >
              <span
                aria-hidden
                className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", severity.dotClass)}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold">{flag.label}</span>
                  <span className="text-[10px] font-medium tracking-wide uppercase opacity-70">
                    {severity.label}
                  </span>
                  <CircleHelpIcon
                    aria-hidden
                    className="size-3 shrink-0 opacity-50"
                  />
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed opacity-80">
                  {flag.rationale}
                </span>
              </span>
            </motion.li>
          );
        })}
      </ul>
      <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
        <InfoIcon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-cyan-deep" />
        <span>
          <strong className="font-semibold text-navy">
            Presentation signals
          </strong>{" "}
          — {PRESENTATION_SIGNALS_DISCLAIMER} {RISK_FLAG_DISCLAIMER}
        </span>
      </p>
    </div>
  );
}
