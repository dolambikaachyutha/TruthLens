"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon, AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { deleteClaim } from "@/lib/claim-store";
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
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reason, setReason] = useState<DeleteReason>("test_submission");
  const [reasonDetail, setReasonDetail] = useState("");

  async function handleDelete() {
    if (reason === "other" && reasonDetail.trim().length < 5) {
      toast.error("Explain the reason (at least 5 characters).");
      return;
    }
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 300));
    const ok = deleteClaim(claimId, { reason, reasonDetail });
    setDeleting(false);
    setConfirming(false);
    if (ok) {
      toast.success("Claim removed from the public feed", {
        description:
          "Record kept for audit. This public demo delete has no sign-in — production requires authenticated moderators.",
      });
      if (onDeleted) {
        onDeleted();
      } else {
        router.push("/feed");
      }
    } else {
      toast.error("Could not delete this claim", {
        description: "Published claims cannot be deleted, or it is already gone.",
      });
    }
  }

  return (
    <div className="relative inline-block">
      <AnimatePresence mode="wait">
        {!confirming ? (
          <motion.button
            key="delete-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label="Delete this claim — requires confirmation"
            data-testid="delete-claim-btn"
          >
            <Trash2Icon className="size-3.5" aria-hidden />
            Delete claim
          </motion.button>
        ) : (
          <motion.div
            key="confirm-panel"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
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
              Public demo delete — no sign-in. Production deletion should require
              authenticated moderator permissions.
            </p>

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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
