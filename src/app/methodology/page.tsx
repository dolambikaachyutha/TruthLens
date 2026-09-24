import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpenIcon,
  CircleCheckIcon,
  EyeIcon,
  FileTextIcon,
  FlagIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/claims/badges";
import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";
import { RISK_FLAG_DISCLAIMER, STATUS_META } from "@/lib/meta";
import type { ClaimStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How TruthLens handles risk signals, review statuses, evidence notes, and what the platform deliberately does not do.",
};

const statusOrder: ClaimStatus[] = [
  "unverified",
  "in_review",
  "misleading",
  "verified_true",
  "verified_false",
];

const flagCatalog = [
  {
    label: "Credential harvesting pattern",
    severity: "high" as const,
    text: "Requests or references for OTP, PIN, password, CVV, verification codes, or login credentials. Pattern signal only — never a truth label.",
    keywords: "OTP · PIN · password · CVV · verification code · login credentials",
  },
  {
    label: "Financial manipulation pattern",
    severity: "high" as const,
    text: "Pressure to pay or move money under a fee pretext. Detected from phrasing such as pay immediately, transfer money, processing fee, UPI, or refund fee.",
    keywords: "Pay immediately · Transfer money · Processing fee · UPI · Refund fee",
  },
  {
    label: "Urgency pressure",
    severity: "medium" as const,
    text: "Deadlines and threat wording that push the reader to act before checking — immediately, within 10 minutes, act now, final warning, account will be blocked.",
    keywords: "Immediately · Within 10 minutes · Act now · Final warning · Threats · Account will be blocked",
  },
  {
    label: "Legal action threat",
    severity: "high" as const,
    text: "Coercive legal framing — penalty, arrest, or service termination — used to force compliance without evidence.",
    keywords: "Penalty · Arrest · Service termination",
  },
  {
    label: "Social engineering pattern",
    severity: "high" as const,
    text: "Win/selection notices, compromised-account claims, or identity-confirm prompts that mimic official channels.",
    keywords: "You've won · You've been selected · Your account has been compromised · Confirm your identity",
  },
  {
    label: "Sensational language",
    severity: "medium" as const,
    text: "Viral-style framing — “breaking,” “shocking,” “before it's deleted” — that prioritizes shareability over sourcing.",
    keywords: "Breaking · Shocking · Share before deleted · Viral",
  },
  {
    label: "Shouting (all caps)",
    severity: "medium" as const,
    text: "More than half of alphabetic characters are uppercase. A formatting signal, not an argument about content.",
    keywords: "Uppercase ratio above 50%",
  },
  {
    label: "Unsourced",
    severity: "high" as const,
    text: "No source URL was provided for reviewers to open — the claim cannot be traced to a primary document at intake.",
    keywords: "Missing source URL",
  },
];

const processSteps = [
  {
    icon: FileTextIcon,
    title: "Submission",
    text: "Anyone submits a claim verbatim. The original wording is frozen at intake — reviewers append context, they never rewrite history.",
  },
  {
    icon: FlagIcon,
    title: "Automated signals",
    text: "Deterministic keyword and pattern rules scan for credential harvesting, financial pressure, urgency threats, legal-action threats, social engineering, missing attribution, and source gaps — then attach risk flags with a plain-language rationale.",
  },
  {
    icon: EyeIcon,
    title: "Human review",
    text: "A reviewer checks primary sources, writes an evidence note, and records one of five statuses. No status is ever assigned by automation.",
  },
  {
    icon: CircleCheckIcon,
    title: "Public trail",
    text: "Signals, notes, statuses, and timestamps stay visible on the claim page so readers can audit how the assessment was reached.",
  },
];

const boundaries = [
  "We never automatically label a claim true or false.",
  "Risk flags are workload signals, not accusations of bad intent.",
  "Reviewer statuses reflect the evidence available at the time of review.",
  "Original claim text and review history are preserved and public.",
  "No login is required to read, submit, or review.",
];

export default function MethodologyPage() {
  return (
    <div>
      <section className="border-b border-border/40 bg-background">
        <div className="container-page relative py-14 sm:py-16">
          <div aria-hidden className="hero-grid absolute inset-0 opacity-30" />
          <div className="relative max-w-3xl">
            <p className="section-label text-cyan-signal">Methodology</p>
            <h1 className="mt-4 font-heading text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
              How TruthLens decides what deserves a closer look
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              This page documents the triage model end to end: what automation
              does, where it stops, how reviewers record decisions, and which
              lines the platform refuses to cross.
            </p>
          </div>
        </div>
      </section>

      <div className="container-page space-y-14 py-14">
        <Reveal>
          <section aria-labelledby="principle-heading">
            <p className="section-label text-cyan-signal">Core principle</p>
            <h2
              id="principle-heading"
              className="mt-3 max-w-2xl font-heading text-2xl font-normal tracking-tight text-foreground sm:text-3xl"
            >
              {RISK_FLAG_DISCLAIMER}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              TruthLens treats triage as an editorial workflow, not a
              truth-detection machine. Automation answers one question —{" "}
              <em>“Does this claim pattern warrant human attention?”</em> — and
              hands the result to people. Every truth-adjacent judgment is made
              by a named reviewer who leaves a written evidence trail.
            </p>
          </section>
        </Reveal>

        <section aria-labelledby="process-heading">
          <Reveal>
            <p className="section-label text-cyan-signal">Process</p>
            <h2
              id="process-heading"
              className="mt-3 font-heading text-2xl font-normal tracking-tight text-foreground sm:text-3xl"
            >
              From submission to public record
            </h2>
          </Reveal>
          <ol className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {processSteps.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.07}>
                <li className="h-full rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-sm">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-foreground text-background">
                    <step.icon aria-hidden className="size-5" />
                  </div>
                  <p className="section-label mb-1.5 text-muted-foreground">0{i + 1}</p>
                  <h3 className="font-heading text-base font-normal text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        <section aria-labelledby="status-heading">
          <Reveal>
            <p className="section-label text-cyan-signal">Status glossary</p>
            <h2
              id="status-heading"
              className="mt-3 font-heading text-2xl font-normal tracking-tight text-foreground sm:text-3xl"
            >
              The five review statuses
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Statuses are assigned by reviewers only. A claim always enters
              the queue as <strong>Unverified</strong>.
            </p>
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {statusOrder.map((status, i) => (
              <Reveal key={status} delay={i * 0.05}>
                <div className="flex h-full gap-4 rounded-2xl border border-border bg-card p-5">
                  <StatusBadge status={status} className="mt-0.5 shrink-0" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {STATUS_META[status].description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section aria-labelledby="flags-heading">
          <Reveal>
            <p className="section-label text-cyan-signal">Signal catalog</p>
            <h2
              id="flags-heading"
              className="mt-3 font-heading text-2xl font-normal tracking-tight text-foreground sm:text-3xl"
            >
              Example risk flags
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Each flag ships with a severity, a plain-language rationale, and
              the keyword family it belongs to. Categories cover credential
              harvesting, financial manipulation, urgency pressure, legal-action
              threats, and social engineering — plus style and sourcing signals.
              Flags prioritize review; they never decide truth.
            </p>
          </Reveal>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {flagCatalog.map((flag, i) => (
              <Reveal key={flag.label} delay={i * 0.05}>
                <div className="h-full rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-heading text-base font-normal text-foreground">
                      {flag.label}
                    </h3>
                    <span
                      className={
                        flag.severity === "high"
                          ? "rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide text-red-700 uppercase"
                          : flag.severity === "medium"
                            ? "rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide text-amber-800 uppercase"
                            : "rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide text-blue-700 uppercase"
                      }
                    >
                      {flag.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {flag.text}
                  </p>
                  <p className="mt-3 border-t border-border pt-2.5 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-mono text-[10px] font-semibold tracking-wide text-foreground uppercase">
                      Keywords:
                    </span>{" "}
                    {flag.keywords}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal>
          <section
            aria-labelledby="boundaries-heading"
            className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-white sm:p-8"
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlertIcon aria-hidden className="size-5 text-blue-400" />
              <h2
                id="boundaries-heading"
                className="text-xl font-semibold sm:text-2xl"
              >
                What this platform will not do
              </h2>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {boundaries.map((line) => (
                <li
                  key={line}
                  className="flex gap-2.5 text-sm leading-relaxed text-neutral-300"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-400"
                  />
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                render={<Link href="/feed" />}
                nativeButton={false}
                className="h-11 rounded-full bg-white px-6 font-mono text-xs font-semibold tracking-[0.12em] text-neutral-950 uppercase transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50"
              >
                <BookOpenIcon aria-hidden className="size-4" />
                See it applied in the feed
              </Button>
              <Button
                render={<Link href="/submit" />}
                nativeButton={false}
                variant="outline"
                className="h-11 rounded-full border-neutral-700 bg-transparent px-6 font-mono text-xs font-semibold tracking-[0.12em] text-white uppercase hover:bg-neutral-900 hover:text-white"
              >
                Submit a claim
              </Button>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
