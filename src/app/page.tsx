import Link from "next/link";
import { ArrowRightIcon, BookOpenIcon, ShieldCheckIcon } from "lucide-react";
import { Hero, HowItWorks } from "@/components/landing/hero";
import {
  RecentClaimsBlurb,
  RecentClaimsSection,
} from "@/components/claims/recent-claims";
import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";

const principles = [
  {
    title: "Flags are not verdicts",
    text: "Risk signals describe patterns worth a closer look — they never declare a claim true or false.",
  },
  {
    title: "Original text is sacred",
    text: "Submissions are preserved word for word. Reviewers add context; they never rewrite the claim.",
  },
  {
    title: "History stays public",
    text: "Every status change and evidence note remains on the record, attributed and timestamped.",
  },
];

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />

      <section aria-labelledby="recent-heading" className="border-y border-border/50 bg-muted/40 py-16 sm:py-20">
        <div className="container-page">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-label">On the desk now</p>
              <h2
                id="recent-heading"
                className="mt-3 font-heading text-3xl font-normal tracking-tight text-foreground"
              >
                Recently submitted
              </h2>
              <RecentClaimsBlurb />
            </div>
            <Button
              render={<Link href="/feed" />}
              nativeButton={false}
              variant="outline"
              className="h-11 rounded-full bg-background font-mono text-xs font-semibold tracking-[0.12em] uppercase"
            >
              View full feed
              <ArrowRightIcon aria-hidden className="size-4" />
            </Button>
          </Reveal>

          <RecentClaimsSection />
        </div>
      </section>

      <section aria-labelledby="principles-heading" className="container-page py-16 sm:py-20">
        <Reveal className="max-w-2xl">
          <p className="section-label">Editorial standards</p>
          <h2
            id="principles-heading"
            className="mt-3 font-heading text-3xl font-normal tracking-tight text-foreground sm:text-4xl"
          >
            Built to stay neutral
          </h2>
        </Reveal>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {principles.map((principle, i) => (
            <Reveal key={principle.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-sm">
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <ShieldCheckIcon aria-hidden className="size-5" />
                </div>
                <h3 className="font-heading text-lg font-normal text-foreground">
                  {principle.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {principle.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-10">
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <p className="section-label mb-2 text-blue-400/90">Methodology</p>
              <h3 className="font-heading text-xl font-normal">
                Curious how each status is decided?
              </h3>
              <p className="mt-1 text-sm text-neutral-400">
                Read the methodology behind flags, statuses, and reviewer notes.
              </p>
            </div>
            <Button
              render={<Link href="/methodology" />}
              nativeButton={false}
              className="h-11 shrink-0 rounded-full bg-white px-6 font-mono text-xs font-semibold tracking-[0.12em] text-neutral-950 uppercase transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <BookOpenIcon aria-hidden className="size-4" />
              Read the methodology
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
