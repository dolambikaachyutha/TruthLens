"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/states/state-panels";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page py-16">
      <ErrorState
        title="This page hit an unexpected error"
        description="The triage desk ran into a problem while rendering this view. Your data is untouched — retry to reload it."
        onRetry={reset}
      />
    </div>
  );
}
