"use client";

import { useSyncExternalStore } from "react";
import {
  listClaims,
  subscribeClaims,
  getStoredClaim,
} from "@/lib/claim-store";
import type { Claim } from "@/lib/types";

const EMPTY_CLAIMS: Claim[] = [];

export function useClaims(): Claim[] {
  return useSyncExternalStore(
    subscribeClaims,
    listClaims,
    () => EMPTY_CLAIMS
  );
}

export function useClaim(id: string | null): Claim | undefined {
  return useSyncExternalStore(
    subscribeClaims,
    () => (id ? getStoredClaim(id) : undefined),
    () => undefined
  );
}
