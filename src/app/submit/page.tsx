import type { Metadata } from "next";
import { ClaimForm } from "@/components/submit/claim-form";

export const metadata: Metadata = {
  title: "Submit a claim",
  description:
    "Paste a claim as it circulated, add where you saw it, and watch live presentation-signal analysis before it enters the public review queue.",
};

export default function SubmitPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mx-auto max-w-2xl">
        <p className="section-label text-cyan-signal">Public submission</p>
        <h1 className="mt-3 font-heading text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
          Submit a claim
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Paste a claim you&apos;ve encountered, exactly as it circulated. Live
          triage checks highlight credential-harvesting and social-engineering
          keywords, financial pressure, urgency and legal threats, sensational
          language, shouting, and missing sources — signals for reviewers,
          never verdicts.
        </p>
      </header>

      <div className="mx-auto mt-8 max-w-2xl">
        <ClaimForm />
      </div>
    </div>
  );
}
