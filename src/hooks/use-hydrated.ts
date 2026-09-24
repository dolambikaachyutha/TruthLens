"use client";

import { useSyncExternalStore } from "react";

const subscribeHydrated = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydrated,
    () => true,
    () => false
  );
}
