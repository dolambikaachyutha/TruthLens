import { FeedSkeleton } from "@/components/states/skeletons";

export default function FeedLoading() {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mb-8 max-w-2xl space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-9 w-72 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>
      <FeedSkeleton count={4} />
    </div>
  );
}
