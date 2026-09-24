"use client";

import Link from "next/link";
import { ClaimCard } from "@/components/claims/claim-card";
import { EmptyState } from "@/components/states/state-panels";
import { StaggerItem, StaggerList } from "@/components/shared/reveal";
import { useClaims } from "@/hooks/use-claims";

export function RecentClaimsSection() {
  const claims = useClaims();
  const recent = claims
    .filter((claim) => !claim.isDeleted)
    .sort(
      (a, b) =>
        (b.sameClaimCount ?? 0) - (a.sameClaimCount ?? 0) ||
        b.submittedAt.localeCompare(a.submittedAt)
    )
    .slice(0, 3);

  if (recent.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          title="Nothing on the desk yet"
          description="No claims have been submitted. Post the first claim to see its signals, evidence notes, and review trail here."
          actionLabel="Submit a claim"
          actionHref="/submit"
        />
      </div>
    );
  }

  return (
    <StaggerList className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {recent.map((claim) => (
        <StaggerItem key={claim.id}>
          <ClaimCard claim={claim} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}

export function RecentClaimsBlurb() {
  const claims = useClaims().filter((claim) => !claim.isDeleted);
  return (
    <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
      {claims.length > 0
        ? "A live sample from the public queue. Open any claim to read the signals, the evidence notes, and the full review trail."
        : "No claims have been submitted yet. The first submission will appear here with its signals and review trail."}
    </p>
  );
}

export function FeedLink() {
  return (
    <Link
      href="/feed"
      className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
    >
      View full feed
    </Link>
  );
}
