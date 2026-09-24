import type { ReactNode } from "react";
import Link from "next/link";
import { InboxIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-6 py-14 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-white text-navy ring-1 ring-border">
        {icon ?? <InboxIcon aria-hidden className="size-6" />}
      </div>
      <h3 className="font-heading text-lg font-normal text-navy">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {actionLabel && (actionHref || onAction) && (
        <div className="mt-5">
          {actionHref ? (
            <Button
              render={<Link href={actionHref} />}
              nativeButton={false}
              className="h-9"
            >
              {actionLabel}
            </Button>
          ) : (
            <Button type="button" onClick={onAction} className="h-9">
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this content. The issue is on our side — try again in a moment.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/60 px-6 py-14 text-center"
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-white text-red-600 ring-1 ring-red-200">
        <TriangleAlertIcon aria-hidden className="size-6" />
      </div>
      <h3 className="font-heading text-lg font-normal text-red-800">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-red-700/80">
        {description}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex h-9 items-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:ring-3 focus-visible:ring-red-300 focus-visible:outline-none"
        >
          Try again
        </button>
      )}
    </div>
  );
}
