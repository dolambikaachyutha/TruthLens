"use client";

import { useState } from "react";
import { Trash2Icon, AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { DELETE_REASON_LABELS } from "@/lib/meta";
import { DELETE_REASONS, type DeleteReason } from "@/lib/types";

interface DeleteClaimButtonProps {
  claimId: string;
  /** Called after successful deletion so parent can navigate away. */
  onDeleted?: () => void;
}

/**
 * Controlled public-demo delete for a claim (no auth by design).
 * Two-step confirm + reason. Soft-deletes out of public feeds (DP3).
 * No edit path is exposed.
 */
export function DeleteClaimButton({ claimId, onDeleted }: DeleteClaimButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reason, setReason] = useState<DeleteReason>("test_submission");
  const [reasonDetail, setReasonDetail] = useState("");
  const [deletionToken, setDeletionToken] = useState("");

  async function handleDelete() {
    if (reason === "other" && reasonDetail.trim().length < 5) {
      toast.error("Explain the reason (at least 5 characters).");
      return;
    }
    setDeleting(true);
    const response = await fetch("/api/claims/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId, deletionToken, reason, reasonDetail }),
    });
    if (response.ok) {
      toast.success("Claim removed from the public feed", {
        description:
          "The original record remains available for audit.",
      });
      if (onDeleted) {
        onDeleted();
      } else {
        // The claim disappears from the shared read API immediately after deletion.
        // A hard redirect avoids rendering the detail route after that removal.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/feed");
      }
      return;
    } else {
      toast.error("Could not delete this claim", {
        description: "Provide the deletion token shown after submission.",
      });
    }
    setDeleting(false);
    setConfirming(false);
  }

  return (
    <div className="relative inline-block">
      <>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label="Delete this claim — requires confirmation"
            data-testid="delete-claim-btn"
          >
            <Trash2Icon className="size-3.5" aria-hidden />
            Delete claim
          </button>
        ) : (
          <div
            className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-red-300 bg-red-50 p-4"
            role="alertdialog"
            aria-label="Delete claim?"
            aria-modal="false"
          >
            <div className="flex items-start gap-2">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-red-900">Delete claim?</p>
                <p className="mt-1 text-xs leading-relaxed text-red-800">
                  This action removes the claim from the public feed. Use it only
                  for spam, duplicates, privacy, safety, malicious links, test
                  submissions, or policy violations. Original text is never edited.
                </p>
              </div>
            </div>

            <label className="flex flex-col gap-1 text-xs font-medium text-red-900">
              Reason
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as DeleteReason)}
                className="h-9 rounded-md border border-red-200 bg-white px-2 text-sm text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                data-testid="delete-claim-reason"
              >
                {DELETE_REASONS.map((value) => (
                  <option key={value} value={value}>
                    {DELETE_REASON_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            {reason === "other" && (
              <label className="flex flex-col gap-1 text-xs font-medium text-red-900">
                Explanation
                <input
                  type="text"
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  minLength={5}
                  placeholder="Why is this claim being removed?"
                  className="h-9 rounded-md border border-red-200 bg-white px-2 text-sm text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  data-testid="delete-claim-reason-detail"
                />
              </label>
            )}

            <p className="text-[11px] text-red-800/90">
              Enter the private token shown after submission. Production should
              also require authenticated moderation for sensitive claims.
            </p>

            <label className="flex flex-col gap-1 text-xs font-medium text-red-900">
              Deletion token
              <input
                type="password"
                value={deletionToken}
                onChange={(e) => setDeletionToken(e.target.value)}
                className="h-9 rounded-md border border-red-200 bg-white px-2 text-sm text-navy"
                data-testid="delete-claim-token"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                data-testid="delete-claim-confirm"
              >
                {deleting ? (
                  <Loader2Icon className="size-3 animate-spin" aria-hidden />
                ) : (
                  <Trash2Icon className="size-3" aria-hidden />
                )}
                {deleting ? "Deleting…" : "Delete claim"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirming(false)}
                className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                data-testid="delete-claim-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </>
    </div>
  );
}
