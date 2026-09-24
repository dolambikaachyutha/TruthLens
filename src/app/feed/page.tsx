import type { Metadata } from "next";
import { FeedBrowser } from "@/components/feed/feed-browser";

export const metadata: Metadata = {
  title: "Public feed",
  description:
    "Every claim submitted to TruthLens, with its review status, category, and automated triage signals. Filter by status or category.",
};

export default function FeedPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <p className="section-label text-cyan-signal">Public queue</p>
        <h1 className="mt-3 font-heading text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
          Claims feed
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Every claim submitted to the desk, including unverified ones — visible
          to everyone. Sorted by same-claim count first, then most recent.
          Filter by status or category; no claim is ever hidden after
          submission.
        </p>
      </header>

      <div className="mt-8">
        <FeedBrowser />
      </div>
    </div>
  );
}
