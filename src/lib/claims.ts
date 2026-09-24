import type { Claim } from "@/lib/types";
import { listClaims } from "@/lib/claim-store";

/**
 * Server-safe claims accessors. Local submissions live in the browser
 * store; this module always returns an empty list during SSR/prerender.
 * Client components should read from `@/lib/claim-store` after hydration.
 */
export const CLAIMS: Claim[] = [];

export function getClaimById(id: string): Claim | undefined {
  if (typeof window === "undefined") return undefined;
  return listClaims().find((claim) => claim.id === id);
}

export function getRecentClaims(limit = 3): Claim[] {
  if (typeof window === "undefined") return [];
  return listClaims()
    .filter((claim) => !claim.isDeleted)
    .sort(
      (a, b) =>
        (b.sameClaimCount ?? 0) - (a.sameClaimCount ?? 0) ||
        b.submittedAt.localeCompare(a.submittedAt)
    )
    .slice(0, limit);
}

export function getClientRecentClaims(limit = 3): Claim[] {
  if (typeof window === "undefined") return [];
  return listClaims()
    .filter((claim) => !claim.isDeleted)
    .sort(
      (a, b) =>
        (b.sameClaimCount ?? 0) - (a.sameClaimCount ?? 0) ||
        b.submittedAt.localeCompare(a.submittedAt)
    )
    .slice(0, limit);
}
