import type { Claim } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseClaimsConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function restUrl(): string {
  return `${supabaseUrl}/rest/v1/truthlens_claims`;
}

function headers(prefer?: string): HeadersInit {
  return {
    apikey: supabaseAnonKey ?? "",
    Authorization: `Bearer ${supabaseAnonKey ?? ""}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

export async function readSupabaseClaims(): Promise<Claim[]> {
  const response = await fetch(`${restUrl()}?select=payload&order=submitted_at.desc`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase read failed: ${response.status}`);
  const rows = (await response.json()) as { payload: Claim }[];
  return rows.map((row) => row.payload);
}

export async function upsertSupabaseClaims(claims: Claim[]): Promise<Claim[]> {
  const rows = claims.map((claim) => ({
    id: claim.id,
    payload: claim,
    submitted_at: claim.submittedAt,
    updated_at: claim.updatedAt,
  }));
  const response = await fetch(restUrl(), {
    method: "POST",
    headers: headers("resolution=merge-duplicates,return=representation"),
    body: JSON.stringify(rows),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase write failed: ${response.status}`);
  const saved = (await response.json()) as { payload: Claim }[];
  return saved.map((row) => row.payload);
}