"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { InfoIcon } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/claims/badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogViewport,
} from "@/components/ui/dialog";
import { useReviewActions } from "@/hooks/use-review-actions";
import { STATUS_META } from "@/lib/meta";
import type { Claim, ClaimStatus } from "@/lib/types";
import { excerpt } from "@/lib/format";

/**
 * Confirmation modal for changing a claim's workflow status from the public
 * feed. Final verdict statuses (Verified True/False, Misleading) are never
 * set here — they require the full evidence form in the reviewer workspace.
 */
export function StatusChangeDialog({
  claim,
  open,
  onOpenChange,
  onStatusChanged,
}: {
  claim: Claim | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged?: (claim: Claim) => void;
}) {
  const { startReview } = useReviewActions();
  const [pendingTarget, setPendingTarget] = useState<ClaimStatus | null>(null);
  const reduceMotion = useReducedMotion();

  if (!claim) return null;

  const currentMeta = STATUS_META[claim.claimStatus];
  const canStartReview =
    claim.claimStatus === "unverified" && !claim.publishedReview;

  function confirmChange() {
    if (!claim || !pendingTarget) return;
    if (pendingTarget === "in_review") {
      const next = startReview(claim.id);
      if (next) onStatusChanged?.(next);
    }
    setPendingTarget(null);
    onOpenChange(false);
  }

  function requestChange(target: ClaimStatus) {
    if (!claim) return;
    if (target === claim.claimStatus) {
      toast.message("Status unchanged.", {
        description: `This claim is already ${currentMeta.label}.`,
      });
      return;
    }
    setPendingTarget(target);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogViewport>
          <DialogPopup data-testid="status-change-dialog">
            <DialogTitle>Change claim status</DialogTitle>
            <DialogDescription>
              Update the workflow status for this claim without leaving the
              feed. Final verdict statuses require the full evidence form in
              the reviewer workspace.
            </DialogDescription>

            <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={claim.claimStatus} />
                <span className="text-xs text-muted-foreground">
                  Current status
                </span>
              </div>
              <p className="text-sm font-medium text-navy">{claim.title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {excerpt(claim.body, 140)}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentMeta.description}
              </p>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {pendingTarget ? (
                <motion.div
                  key="confirm"
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
                  className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
                >
                <p className="text-sm font-semibold text-amber-900">
                  Confirm status change
                </p>
                <p className="text-sm leading-relaxed text-amber-800">
                  Change from{" "}
                  <strong>{currentMeta.label}</strong> to{" "}
                  <strong>{STATUS_META[pendingTarget].label}</strong>? This
                  action is recorded in the public review history. Original
                  claim text is never edited.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="h-9 bg-navy font-semibold text-white hover:bg-navy-deep"
                    onClick={confirmChange}
                    data-testid="status-change-confirm"
                  >
                    Confirm change
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() => setPendingTarget(null)}
                    data-testid="status-change-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
                className="mt-4 space-y-3"
              >
                <p className="flex gap-2 rounded-lg border border-border bg-accent/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  <InfoIcon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-cyan-deep" />
                  Risk flags are triage signals for reviewers — they are not
                  factual verdicts. Automation never assigns a final status.
                </p>
                <div className="flex flex-wrap gap-2">
                  {canStartReview && (
                    <Button
                      type="button"
                      className="h-9 bg-navy font-semibold text-white hover:bg-navy-deep"
                      onClick={() => requestChange("in_review")}
                      data-testid="status-change-start-review"
                    >
                      Start review
                    </Button>
                  )}
                  {claim.publishedReview ? (
                    <p className="text-xs text-muted-foreground">
                      A verdict has already been published. Further status
                      updates are handled through corrections.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Verified True / Verified False / Misleading can only be
                      published from the reviewer workspace with a completed
                      evidence form.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </DialogPopup>
        </DialogViewport>
      </DialogPortal>
    </Dialog>
  );
}
