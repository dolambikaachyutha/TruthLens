"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRightIcon,
  EyeIcon,
  FileSearchIcon,
  ScaleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClaims } from "@/hooks/use-claims";

const steps = [
  {
    icon: FileSearchIcon,
    title: "Submit the claim",
    text: "Anyone can post a claim exactly as it circulates — no account, no gatekeeping.",
  },
  {
    icon: EyeIcon,
    title: "Read the signals",
    text: "Automated triage raises risk flags such as missing sources or urgency language. Signals, never verdicts.",
  },
  {
    icon: ScaleIcon,
    title: "Follow the evidence",
    text: "Reviewers record notes and a status in public. The original text and full history stay intact.",
  },
];

const audienceTabs = ["Civic", "Public Safety", "Media Literacy"] as const;

export function Hero() {
  const reduceMotion = useReducedMotion();
  const allClaims = useClaims();
  const claims = allClaims.filter((c) => !c.isDeleted);
  const stats = [
    { label: "Claims on record", value: claims.length },
    {
      label: "Awaiting first pass",
      value: claims.filter(
        (c) => c.claimStatus === "unverified" || c.claimStatus === "in_review"
      ).length,
    },
    {
      label: "Flagged high risk",
      value: claims.filter((c) => c.riskLevel === "high").length,
    },
    {
      label: "Categories covered",
      value: new Set(claims.map((c) => c.category)).size,
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-border/40 bg-background">
      <div aria-hidden className="hero-glow absolute inset-0" />
      <div aria-hidden className="hero-grid absolute inset-0 opacity-40" />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background"
      />
      <div className="container-page relative py-16 sm:py-20 lg:py-24">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <div className="mb-6 flex flex-wrap gap-2">
            {audienceTabs.map((tab, i) => (
              <span
                key={tab}
                className={
                  i === 0
                    ? "inline-flex h-8 items-center rounded-full bg-foreground px-4 font-mono text-[11px] font-semibold tracking-[0.12em] text-background uppercase"
                    : "inline-flex h-8 items-center rounded-full border border-border bg-background/80 px-4 font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase"
                }
              >
                {tab}
              </span>
            ))}
          </div>

          <p className="section-label text-cyan-signal">Public misinformation triage</p>
          <h1 className="mt-4 font-heading text-4xl leading-[1.08] font-normal tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            See the signal.
            <br />
            <span className="text-cyan-signal">Follow the evidence.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            TruthLens is an open triage desk for circulating claims. Submit
            what you encountered, watch automated risk signals surface what
            deserves attention, and read the evidence trail reviewers leave
            behind — transparently, from first flag to final note.
          </p>

          <div className="mt-4 max-w-2xl space-y-2 rounded-xl border border-border/70 bg-card/70 p-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-foreground uppercase">
                Risk flags
              </span>{" "}
              — pattern detection for reviewers. Never a factual verdict.
            </p>
            <p>
              <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-foreground uppercase">
                Human review
              </span>{" "}
              — Community reviewers publish status with cited evidence only.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              render={<Link href="/submit" />}
              nativeButton={false}
              className="h-12 rounded-full bg-primary px-7 font-mono text-xs font-semibold tracking-[0.12em] text-primary-foreground uppercase shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
            >
              Submit a claim
              <ArrowRightIcon aria-hidden className="size-4" />
            </Button>
            <Button
              render={<Link href="/feed" />}
              nativeButton={false}
              variant="outline"
              className="h-12 rounded-full border-border bg-background px-7 font-mono text-xs font-semibold tracking-[0.12em] uppercase transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent"
            >
              Browse the public feed
            </Button>
          </div>
        </motion.div>

        {claims.length > 0 && (
          <>
            <motion.dl
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="bg-card px-5 py-4">
                  <dt className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-foreground tabular-nums">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </motion.dl>
            <p className="mt-3 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
              Counts reflect claims currently on record.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="container-page py-16 sm:py-20">
      <div className="max-w-2xl">
        <p className="section-label">How triage works</p>
        <h2
          id="how-heading"
          className="mt-3 font-heading text-3xl font-normal tracking-tight text-foreground sm:text-4xl"
        >
          Signals first. Evidence always.
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Three deliberate steps keep the process honest — automation points,
          people decide, and everything stays on the record.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-sm"
          >
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
              <step.icon aria-hidden className="size-5" />
            </div>
            <p className="section-label mb-2 text-muted-foreground">
              0{i + 1}
            </p>
            <h3 className="font-heading text-lg font-normal text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className="absolute top-1/2 -right-3 hidden h-px w-6 bg-border md:block"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
