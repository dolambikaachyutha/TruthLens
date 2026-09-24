import { NextResponse } from "next/server";
import { readClaims, upsertClaim, upsertMany } from "@/lib/server/claims-fs";
import type { Claim } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const claims = await readClaims();
  return NextResponse.json(claims, { headers: noStore });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: noStore }
    );
  }

  if (Array.isArray(body)) {
    const claims = body.filter(
      (item): item is Claim =>
        Boolean(item) && typeof (item as Claim).id === "string"
    );
    const saved = await upsertMany(claims);
    return NextResponse.json(saved, { headers: noStore });
  }

  const incoming = body as Claim;
  if (!incoming || typeof incoming.id !== "string") {
    return NextResponse.json(
      { error: "A claim with an id is required." },
      { status: 400, headers: noStore }
    );
  }

  const saved = await upsertClaim(incoming);
  return NextResponse.json(saved, { headers: noStore });
}
