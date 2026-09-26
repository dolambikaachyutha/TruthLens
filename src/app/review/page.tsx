import type { Metadata } from "next";
import { InfoIcon } from "lucide-react";
import { ReviewWorkspace } from "@/components/review/review-workspace";
import { HUMAN_REVIEW_MESSAGE } from "@/lib/automation";
import { RISK_FLAG_DISCLAIMER } from "@/lib/meta";

export const metadata: Metadata = {
  title: "Reviewer workspace",
  description:
    "Human review workspace for original claims and risk signals. No login required.",
};

export default function ReviewPage() {
  return (
    <div className="bg-muted/40">
      <div className="container-page py-10 sm:py-14">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="section-label text-cyan-signal">
              Internal desk · publicly readable
            </p>
            <h1 className="mt-3 font-heading text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
              Reviewer workspace
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Inspect the original claim and risk signals, then publish a human verdict as{" "}
              <strong className="text-foreground">Community reviewer</strong>.
              Original text is never edited — reviewers only append to the
              history.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {HUMAN_REVIEW_MESSAGE}
            </p>
          </div>
          <div className="flex max-w-xs flex-col gap-2">
            <p className="flex gap-2 rounded-lg border border-cyan-signal/30 bg-accent/60 px-3.5 py-2.5 text-xs leading-relaxed text-accent-foreground">
              <InfoIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {RISK_FLAG_DISCLAIMER}
            </p>
            <p className="flex gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <InfoIcon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-cyan-deep" />
              Risk signals are triage aids only. Reviewers must assess evidence themselves.
            </p>
          </div>
        </header>

        <div className="mt-8">
          <ReviewWorkspace />
        </div>
      </div>
    </div>
  );
}
