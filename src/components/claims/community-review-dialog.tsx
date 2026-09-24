"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { InfoIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  hasReviewedCommunity,
  submitCommunityReview,
} from "@/lib/claim-store";
import { excerpt } from "@/lib/format";
import {
  COMMUNITY_REVIEW_DISCLAIMER,
  COMMUNITY_REVIEW_STANCE_OPTIONS,
  REVIEW_CONFIDENCE_META,
} from "@/lib/meta";
import type {
  Claim,
  CommunityReviewStance,
  ReviewConfidence,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const CONFIDENCE_OPTIONS: ReviewConfidence[] = ["low", "medium", "high"];

export function CommunityReviewDialog({
  claim,
  open,
  onOpenChange,
  onReviewAdded,
}: {
  claim: Claim | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewAdded?: (claim: Claim) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [reviewerLabel, setReviewerLabel] = useState("");
  const [stance, setStance] = useState<CommunityReviewStance>("needs_context");
  const [note, setNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [confidence, setConfidence] = useState<ReviewConfidence>("medium");
  const [error, setError] = useState<string | null>(null);

  const alreadyReviewed = useMemo(() => {
    if (!claim) return false;
    return hasReviewedCommunity(claim.id);
    // Re-check whenever the dialog opens for a claim.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim?.id, open]);

  if (!claim) return null;

  const reviewCount = claim.communityReviews?.length ?? 0;

  function resetForm() {
    setReviewerLabel("");
    setStance("needs_context");
    setNote("");
    setEvidenceUrl("");
    setConfidence("medium");
    setError(null);
  }

  function close() {
    resetForm();
    onOpenChange(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!claim) return;

    const trimmedUrl = evidenceUrl.trim();
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      setError("Evidence URL must start with http:// or https://.");
      return;
    }

    const result = submitCommunityReview(claim.id, {
      reviewerLabel,
      stance,
      note,
      evidenceUrls: trimmedUrl ? [trimmedUrl] : [],
      confidence,
    });

    if (!result.ok) {
      setError(result.error);
      toast.error("Could not submit review.", { description: result.error });
      return;
    }

    toast.success("Independent review recorded.", {
      description:
        "Other reviewers can add their own assessments. This is not an official verdict.",
    });
    onReviewAdded?.(result.claim);
    resetForm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogViewport>
          <DialogPopup
            data-testid="community-review-dialog"
            className="max-h-[min(90vh,760px)] overflow-y-auto"
          >
            <DialogTitle>Add independent review</DialogTitle>
            <DialogDescription>
              Record your assessment of this claim. Multiple reviewers can each
              submit one review. Independent reviews never replace the official
              published verdict.
            </DialogDescription>

            <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-sm font-medium text-navy">{claim.title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {excerpt(claim.body, 140)}
              </p>
              <p className="text-xs text-muted-foreground">
                {reviewCount} independent review
                {reviewCount === 1 ? "" : "s"} so far · status stays{" "}
                <strong className="text-navy">
                  {claim.claimStatus === "unverified"
                    ? "Unverified"
                    : claim.claimStatus.replace(/_/g, " ")}
                </strong>{" "}
                until a full evidence form is published in the reviewer
                workspace.
              </p>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {alreadyReviewed ? (
                <motion.div
                  key="already"
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
                  className="mt-4 space-y-3"
                  data-testid="community-review-already"
                >
                  <p className="rounded-lg border border-blue-200 bg-blue-50/70 px-3.5 py-3 text-sm leading-relaxed text-blue-900">
                    You already submitted an independent review for this claim
                    from this browser session. Another reviewer can still add
                    their assessment.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={close}
                  >
                    Close
                  </Button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
                  className="mt-4 space-y-4"
                  data-testid="community-review-form"
                >
                  <p className="flex gap-2 rounded-lg border border-border bg-accent/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    <InfoIcon
                      aria-hidden
                      className="mt-0.5 size-3.5 shrink-0 text-cyan-deep"
                    />
                    {COMMUNITY_REVIEW_DISCLAIMER}
                  </p>

                  <div className="space-y-1.5">
                    <Label htmlFor="cr-reviewer-label" className="text-navy">
                      Your reviewer name{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="cr-reviewer-label"
                      value={reviewerLabel}
                      onChange={(event) => setReviewerLabel(event.target.value)}
                      placeholder="e.g. Civic desk A"
                      maxLength={60}
                      data-testid="community-reviewer-label"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cr-stance" className="text-navy">
                      Your assessment
                    </Label>
                    <select
                      id="cr-stance"
                      value={stance}
                      onChange={(event) =>
                        setStance(
                          event.target.value as CommunityReviewStance
                        )
                      }
                      data-testid="community-review-stance"
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {COMMUNITY_REVIEW_STANCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cr-note" className="text-navy">
                      Review note
                    </Label>
                    <Textarea
                      id="cr-note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="What did you check? Which sources support or contradict the claim? Minimum 20 characters."
                      rows={4}
                      data-testid="community-review-note"
                    />
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {note.trim().length} / 20 minimum characters
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cr-evidence-url" className="text-navy">
                      Evidence URL{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="cr-evidence-url"
                      type="url"
                      value={evidenceUrl}
                      onChange={(event) => setEvidenceUrl(event.target.value)}
                      placeholder="https://"
                      data-testid="community-review-evidence-url"
                    />
                  </div>

                  <fieldset className="space-y-1.5">
                    <legend className="text-sm font-medium text-navy">
                      Confidence
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {CONFIDENCE_OPTIONS.map((option) => (
                        <label
                          key={option}
                          className={cn(
                            "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors",
                            confidence === option
                              ? "border-transparent bg-navy text-white"
                              : "border-border bg-background text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <input
                            type="radio"
                            name="community-confidence"
                            value={option}
                            checked={confidence === option}
                            onChange={() => setConfidence(option)}
                            className="sr-only"
                            data-testid={`community-confidence-${option}`}
                          />
                          {REVIEW_CONFIDENCE_META[option].label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                      data-testid="community-review-error"
                    >
                      {error}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="submit"
                      className="h-9 bg-navy font-semibold text-white hover:bg-navy-deep"
                      data-testid="community-review-submit"
                    >
                      <UsersIcon aria-hidden className="size-4" />
                      Submit independent review
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9"
                      onClick={close}
                      data-testid="community-review-cancel"
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </DialogPopup>
        </DialogViewport>
      </DialogPortal>
    </Dialog>
  );
}
