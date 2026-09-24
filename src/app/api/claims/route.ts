import { NextResponse } from "next/server";
import {
  isSupabaseClaimsConfigured,
  readSupabaseClaims,
  upsertSupabaseClaims,
} from "@/lib/server/claims-supabase";
import type { Claim } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  if (!isSupabaseClaimsConfigured()) {
    return NextResponse.json(
      { error: "Supabase is required for the shared claims feed." },
      { status: 503, headers: noStore }
    );
  }
  try {
    const claims = await readSupabaseClaims();
    return NextResponse.json(claims, { headers: noStore });
  } catch {
    return NextResponse.json(
      { error: "Unable to load shared claims." },
      { status: 503, headers: noStore }
    );
  }
}

export async function POST(request: Request) {
  if (!isSupabaseClaimsConfigured()) {
    return NextResponse.json(
      { error: "Supabase is required for the shared claims feed." },
      { status: 503, headers: noStore }
    );
  }
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
    try {
      const saved = await upsertSupabaseClaims(claims);
      return NextResponse.json(saved, { headers: noStore });
    } catch {
      return NextResponse.json(
        { error: "Unable to save shared claims." },
        { status: 503, headers: noStore }
      );
    }
  }

  const incoming = body as Claim;
  if (!incoming || typeof incoming.id !== "string") {
    return NextResponse.json(
      { error: "A claim with an id is required." },
      { status: 400, headers: noStore }
    );
  }

  try {
    const saved = await upsertSupabaseClaims([incoming]);
    return NextResponse.json(saved[0], { headers: noStore });
  } catch {
    return NextResponse.json(
      { error: "Unable to save shared claim." },
      { status: 503, headers: noStore }
    );
  }
}
