"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  buildAutomationEntry,
  jobsToEvidence,
  type EvidenceDeskResponse,
} from "@/lib/automation";
import {
  getStoredClaim,
  listClaims,
  saveClaim,
} from "@/lib/claim-store";
import type { Claim } from "@/lib/types";

async function requestEvidence(
  claim: Claim,
  forceFail = false
): Promise<EvidenceDeskResponse> {
  const similarPool = listClaims()
    .filter((c) => c.id !== claim.id && !c.isDeleted)
    .map((c) => ({ id: c.id, title: c.title, body: c.body }));

  const response = await fetch("/api/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      claimId: claim.id,
      claimText: claim.body,
      sourceUrl: claim.sourceUrl,
      similarPool,
      forceFail,
    }),
  });

  const data = (await response.json()) as EvidenceDeskResponse;
  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? `Evidence request failed (${response.status})`);
  }
  return data;
}

function deriveAutomationStatus(
  jobs: EvidenceDeskResponse["jobs"]
): Claim["automationStatus"] {
  if (jobs.length === 0) return "failed";
  const errors = jobs.filter((job) => job.status === "error").length;
  if (errors === 0) return "completed";
  if (errors < jobs.length) return "partially_completed";
  return "failed";
}

export function useAutomation() {
  const [runningId, setRunningId] = useState<string | null>(null);
  const activeRef = useRef<Set<string>>(new Set());

  const runAutomation = useCallback(async (claimId: string) => {
    if (activeRef.current.has(claimId)) return;
    const claim = getStoredClaim(claimId);
    if (!claim) return;
    if (claim.publishedReview) return;

    activeRef.current.add(claimId);
    setRunningId(claimId);

    const startedAt = new Date().toISOString();
    const processing: Claim = {
      ...claim,
      automationStatus: "running",
      intakeStatus: "checking",
      updatedAt: startedAt,
    };
    saveClaim(processing);

    try {
      const result = await requestEvidence(processing);
      const evidence = jobsToEvidence(claimId, result.jobs);
      const automationStatus = deriveAutomationStatus(result.jobs);
      const entry = buildAutomationEntry(automationStatus, evidence.length);
      const intakeStatus =
        result.intakeStatus ??
        (automationStatus === "completed"
          ? "ready_for_review"
          : automationStatus === "partially_completed"
            ? "needs_more_context"
            : "failed");
      const intakeCompletedAt = new Date().toISOString();

      // Always merge into the freshest claim so human review fields win.
      const fresh = getStoredClaim(claimId);
      if (!fresh) return;

      const automationPatch: Partial<Claim> = {
        automationStatus,
        evidence,
        automatedEvidenceCount: evidence.length,
        intakeStatus,
        intakeChecks: result.intakeChecks ?? [],
        intakeCompletedAt,
        intakeError:
          intakeStatus === "failed" || intakeStatus === "blocked"
            ? (result.error ?? "Automated intake did not finish cleanly.")
            : null,
        reviewHistory: [...fresh.reviewHistory, entry],
        updatedAt: intakeCompletedAt,
        claimStatus: fresh.claimStatus,
      };

      saveClaim({ ...fresh, ...automationPatch });

      if (intakeStatus === "ready_for_review") {
        toast.success("Automated evidence desk finished.", {
          description: `${evidence.length} evidence record${
            evidence.length === 1 ? "" : "s"
          } · status still Unverified · ready for human review`,
        });
      } else if (intakeStatus === "blocked") {
        toast.message("Intake blocked this submission for safety review.", {
          description: "This is not a truth judgment. Status remains Unverified.",
        });
      } else {
        toast.success("Automated evidence desk finished with warnings.", {
          description: `Intake status: ${intakeStatus}. Status remains Unverified.`,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Evidence gathering failed.";
      const entry = buildAutomationEntry("failed", 0);
      const fresh = getStoredClaim(claimId);
      if (fresh) {
        const next: Claim = {
          ...fresh,
          automationStatus: "failed",
          intakeStatus: "failed",
          intakeCompletedAt: new Date().toISOString(),
          intakeError: message,
          claimStatus: fresh.claimStatus,
          reviewHistory: [...fresh.reviewHistory, entry],
          updatedAt: new Date().toISOString(),
        };
        saveClaim(next);
      }
      toast.error("Evidence gathering failed.", { description: message });
    } finally {
      activeRef.current.delete(claimId);
      setRunningId(null);
    }
  }, []);

  return { runAutomation, runningId };
}
