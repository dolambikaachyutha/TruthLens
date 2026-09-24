import type { Metadata } from "next";
import { ClaimDetail } from "@/components/claims/claim-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Claim ${id}`,
    description:
      "Claim detail with automated evidence gathering, human review verdict, and full review history.",
  };
}

export default async function ClaimDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ClaimDetail id={id} />;
}
