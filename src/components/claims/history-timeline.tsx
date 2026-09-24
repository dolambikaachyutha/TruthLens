import { HistoryIcon } from "lucide-react";
import { StatusBadge } from "@/components/claims/badges";
import { REVIEW_ACTION_LABELS } from "@/lib/meta";
import { formatDateTime } from "@/lib/format";
import type { ReviewEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const dotClassByAction: Record<ReviewEntry["action"], string> = {
  submitted: "bg-slate-400 ring-slate-100",
  started_review: "bg-blue-500 ring-blue-100",
  evidence_note: "bg-violet-500 ring-violet-100",
  status_change: "bg-cyan-signal ring-cyan-100",
  automation_complete: "bg-cyan-deep ring-cyan-100",
  verdict_published: "bg-emerald-500 ring-emerald-100",
  correction_submitted: "bg-amber-500 ring-amber-100",
  same_claim_vote: "bg-indigo-500 ring-indigo-100",
  community_review: "bg-teal-500 ring-teal-100",
  deleted: "bg-red-500 ring-red-100",
};

export function HistoryTimeline({ history }: { history: ReviewEntry[] }) {
  const entries = [...history].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <section aria-labelledby="history-heading" className="space-y-4">
      <div className="flex items-center gap-2">
        <HistoryIcon aria-hidden className="size-4 text-cyan-deep" />
        <h2 id="history-heading" className="font-heading text-base font-normal text-navy">
          Review history
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {entries.length} entr{entries.length === 1 ? "y" : "ies"}
        </span>
      </div>

      <ol className="relative space-y-6 border-l border-border pl-6">
        {entries.map((entry) => (
          <li key={entry.id} className="relative" data-testid={`timeline-${entry.action}`}>
            <span
              aria-hidden
              className={cn(
                "absolute top-1.5 -left-[31px] size-3 rounded-full ring-4",
                dotClassByAction[entry.action]
              )}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-navy">
                {REVIEW_ACTION_LABELS[entry.action]}
              </span>
              <span className="text-xs text-muted-foreground">· {entry.author}</span>
            </div>
            {entry.fromStatus && entry.toStatus && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge status={entry.fromStatus} />
                <span aria-hidden>→</span>
                <StatusBadge status={entry.toStatus} />
              </div>
            )}
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {entry.note}
            </p>
            <time
              dateTime={entry.createdAt}
              className="mt-1 block text-xs text-muted-foreground/70"
            >
              {formatDateTime(entry.createdAt)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}
