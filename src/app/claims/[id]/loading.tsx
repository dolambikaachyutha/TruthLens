import { DetailSkeleton } from "@/components/states/skeletons";

export default function ClaimDetailLoading() {
  return (
    <div className="container-page py-10 sm:py-14">
      <DetailSkeleton />
    </div>
  );
}
