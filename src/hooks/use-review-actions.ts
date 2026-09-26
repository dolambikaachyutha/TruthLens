"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  COMMUNITY_REVIEWER,
  qualityChecklistPassed,
  validatePublishReview,
  type PublishReviewInput,
} from "@/lib/automation";
import { getStoredClaim, saveClaim } from "@/lib/claim-store";
import type { Claim, Verdict } from "@/lib/types";

export function useReviewActions() {
  const [busy, setBusy] = useState(false);

  const startReview = useCallback((claimId: string): Claim | null => {
    const claim = getStoredClaim(claimId);
    if (!claim) return null;
    if (claim.publishedReview) {
      toast.error("A verdict has already been published for this claim.");
      return claim;
    }
    if (claim.claimStatus === "in_review") {
      toast.message("Review already in progress.");
      return claim;
    }

    const now = new Date().toISOString();
    const next: Claim = {
      ...claim,
      claimStatus: "in_review",
      lifecycleState: "under_review",
      humanReview: {
        reviewerLabel: COMMUNITY_REVIEWER,
        startedAt: now,
        note: "",
        evidenceUrls: [],
      },
      reviewHistory: [
        ...claim.reviewHistory,
        {
          id: `rev-start-${Date.now().toString(36)}`,
          action: "started_review",
          author: COMMUNITY_REVIEWER,
          note: "Review started. Inspecting automated evidence and gathering sources.",
          createdAt: now,
          fromStatus: claim.claimStatus,
          toStatus: "in_review",
        },
      ],
      updatedAt: now,
    };
    saveClaim(next);
    toast.success("Review started.", {
      description: "Status set to In Review by Community reviewer.",
    });
    return next;
  }, []);

  const publishVerdict = useCallback(
    (claimId: string, input: PublishReviewInput): Claim | null => {
      const claim = getStoredClaim(claimId);
      if (!claim) return null;

      if (claim.publishedReview) {
        toast.error("A verdict has already been published for this claim.");
        return claim;
      }

      const validation = validatePublishReview(input);
      if (!validation.ok) {
        toast.error("Cannot publish verdict yet.", {
          description: validation.errors[0],
        });
        return claim;
      }

      setBusy(true);
      try {
        const now = new Date().toISOString();
        const evidenceUrls = input.evidenceUrls
          .map((url) => url.trim())
          .filter((url) => url.length > 0);
        const note = input.note.trim();
        const fromStatus = claim.claimStatus;
        const qualityCheckPassed = qualityChecklistPassed(
          input.qualityChecklist
        );

        const next: Claim = {
          ...claim,
          claimStatus: input.verdict,
          lifecycleState: "published_review",
          humanReview: claim.humanReview ?? {
            reviewerLabel: COMMUNITY_REVIEWER,
            startedAt: now,
            note,
            evidenceUrls,
          },
          publishedReview: {
            verdict: input.verdict as Verdict,
            reviewerLabel: COMMUNITY_REVIEWER,
            note,
            evidenceUrls,
            publishedAt: now,
            claimInterpretation: input.claimInterpretation.trim(),
            supportingAnalysis: input.supportingAnalysis.trim(),
            contradictingAnalysis: input.contradictingAnalysis.trim(),
            contextAnalysis: input.contextAnalysis.trim(),
            evidenceStrength: input.evidenceStrength,
            confidence: input.confidence,
            qualityChecklist: input.qualityChecklist,
            qualityCheckPassed,
          },
          isVisibleInReviewedFeed: qualityCheckPassed,
          reviewHistory: [
            ...claim.reviewHistory,
            {
              id: `rev-pub-${Date.now().toString(36)}`,
              action: "verdict_published",
              author: COMMUNITY_REVIEWER,
              note,
              createdAt: now,
              fromStatus,
              toStatus: input.verdict,
            },
          ],
          updatedAt: now,
        };
        saveClaim(next);
        toast.success("Verdict published.", {
          description: `Community reviewer recorded ${
            input.verdict === "verified_true"
              ? "Verified True"
              : input.verdict === "verified_false"
                ? "Verified False"
                : "Misleading"
          }.`,
        });
        return next;
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const appendEvidenceNote = useCallback(
    (claimId: string, note: string, urls: string[]): Claim | null => {
      const claim = getStoredClaim(claimId);
      if (!claim) return null;
      const trimmed = note.trim();
      if (trimmed.length < 15) {
        toast.error("Write an evidence note of at least 15 characters.");
        return claim;
      }
      const now = new Date().toISOString();
      const cleanedUrls = urls
        .map((u) => u.trim())
        .filter((u) => u.length > 0);
      const next: Claim = {
        ...claim,
        humanReview: {
          reviewerLabel: COMMUNITY_REVIEWER,
          startedAt: claim.humanReview?.startedAt ?? now,
          note: trimmed,
          evidenceUrls: cleanedUrls,
        },
        reviewHistory: [
          ...claim.reviewHistory,
          {
            id: `rev-note-${Date.now().toString(36)}`,
            action: "evidence_note",
            author: COMMUNITY_REVIEWER,
            note:
              cleanedUrls.length > 0
                ? `${trimmed} Sources: ${cleanedUrls.join(", ")}`
                : trimmed,
            createdAt: now,
          },
        ],
        updatedAt: now,
      };
      saveClaim(next);
      toast.success("Evidence note appended. Original text untouched.");
      return next;
    },
    []
  );

  return { startReview, publishVerdict, appendEvidenceNote, busy };
}
