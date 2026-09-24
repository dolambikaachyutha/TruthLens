"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
  bootstrapSharedClaims,
  listClaims,
  subscribeClaims,
  getStoredClaim,
  refreshSharedClaims,
} from "@/lib/claim-store";
import type { Claim } from "@/lib/types";

const EMPTY_CLAIMS: Claim[] = [];
const REFRESH_MS = 5000;

export function useClaims(): Claim[] {
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void bootstrapSharedClaims();

    const interval = window.setInterval(() => {
      void refreshSharedClaims();
    }, REFRESH_MS);

    const onFocus = () => {
      void refreshSharedClaims();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return useSyncExternalStore(
    subscribeClaims,
    listClaims,
    () => EMPTY_CLAIMS
  );
}

export function useClaim(id: string | null): Claim | undefined {
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void bootstrapSharedClaims();
  }, []);

  return useSyncExternalStore(
    subscribeClaims,
    () => (id ? getStoredClaim(id) : undefined),
    () => undefined
  );
}

export function useRefreshClaims(): () => void {
  return useCallback(() => {
    void refreshSharedClaims();
  }, []);
}
