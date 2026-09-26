import { NextResponse } from "next/server";
import { DELETE_REASONS } from "@/lib/types";
import { softDeleteClaim } from "@/lib/server/claims-supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const input = body as {
    claimId?: unknown;
    deletionToken?: unknown;
    reason?: unknown;
    reasonDetail?: unknown;
  };
  const reason = input.reason;
  const reasonDetail = typeof input.reasonDetail === "string" ? input.reasonDetail.trim() : "";
  if (
    typeof input.claimId !== "string" ||
    typeof input.deletionToken !== "string" ||
    typeof reason !== "string" ||
    !DELETE_REASONS.includes(reason as (typeof DELETE_REASONS)[number]) ||
    (reason === "other" && reasonDetail.length < 5)
  ) {
    return NextResponse.json({ error: "A valid claim, deletion token, and reason are required." }, { status: 400 });
  }
  try {
    const deleted = await softDeleteClaim(input.claimId, input.deletionToken, reason, reasonDetail);
    return deleted
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Deletion token is invalid or the claim cannot be deleted." }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Unable to process deletion." }, { status: 503 });
  }
}