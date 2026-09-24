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

/**
 * Serializes read-merge-write cycles so concurrent requests in this server
 * process cannot overwrite each other's reviews or support counts.
 */
let writeChain: Promise<unknown> = Promise.resolve();
function withLock<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task, task);
  writeChain = run.then(() => undefined, () => undefined);
  return run;
}

function mergeById<T extends { id: string }>(
  base: T[] | undefined,
  extra: T[] | undefined
): T[] {
  const map = new Map<string, T>();
  for (const item of base ?? []) {
    if (item && typeof item.id === "string") map.set(item.id, item);
  }
  for (const item of extra ?? []) {
    if (item && typeof item.id === "string" && !map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return [...map.values()];
}

function byCreatedAt<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function timeOf(claim: Claim): number {
  return Date.parse(claim.updatedAt || claim.submittedAt) || 0;
}

/**
 * Merges an incoming claim snapshot with the stored claim.
 *
 * Append-only guarantees (AGENTS.md / DECISIONS.md):
 * - Original claim body and title are never changed.
 * - Community reviews, review history, evidence, intake checks, corrections,
 *   and versions are unioned by id — an existing review is never overwritten.
 * - Same-claim voters are unioned and the count never decreases.
 * - A published review is never replaced once stored.
 * - Soft delete flags are sticky (once deleted, stays deleted).
 * - Scalar fields (status, risk, …) take the newer updatedAt snapshot.
 */
export function mergeClaimPayload(existing: Claim, incoming: Claim): Claim {
  const existingTime = timeOf(existing);
  const incomingTime = timeOf(incoming);
  const newer = incomingTime >= existingTime ? incoming : existing;

  return {
    ...existing,
    ...incoming,
    ...newer,
    body: existing.body,
    title: existing.title,
    submittedAt:
      Date.parse(existing.submittedAt) <= Date.parse(incoming.submittedAt)
        ? existing.submittedAt
        : incoming.submittedAt,
    evidence: mergeById(existing.evidence, incoming.evidence),
    intakeChecks: mergeById(existing.intakeChecks, incoming.intakeChecks),
    corrections: mergeById(existing.corrections, incoming.corrections),
    versions: mergeById(existing.versions, incoming.versions),
    reviewHistory: byCreatedAt(
      mergeById(existing.reviewHistory, incoming.reviewHistory)
    ),
    communityReviews: byCreatedAt(
      mergeById(existing.communityReviews ?? [], incoming.communityReviews ?? [])
    ),
    sameClaimVoterIds: [
      ...new Set([
        ...(existing.sameClaimVoterIds ?? []),
        ...(incoming.sameClaimVoterIds ?? []),
      ]),
    ],
    sameClaimCount: Math.max(
      existing.sameClaimCount ?? 0,
      incoming.sameClaimCount ?? 0
    ),
    publishedReview: existing.publishedReview ?? incoming.publishedReview ?? null,
    humanReview: existing.humanReview ?? incoming.humanReview ?? null,
    isDeleted: existing.isDeleted === true || incoming.isDeleted === true,
    deletedAt: existing.deletedAt ?? incoming.deletedAt ?? null,
    deletedReason: existing.deletedReason ?? incoming.deletedReason ?? null,
    deletedReasonDetail:
      existing.deletedReasonDetail ?? incoming.deletedReasonDetail ?? null,
    deletedBy: existing.deletedBy ?? incoming.deletedBy ?? null,
    updatedAt: Math.max(existingTime, incomingTime)
      ? new Date(Math.max(existingTime, incomingTime)).toISOString()
      : (newer.updatedAt ?? existing.updatedAt ?? incoming.updatedAt),
  };
}

/**
 * Reads the current stored payloads for the given ids so incoming writes can
 * be merged instead of overwriting (PostgREST `resolution=merge-duplicates`
 * replaces the whole JSONB payload, which would drop another browser's
 * just-submitted review).
 */
async function readExistingPayloads(ids: string[]): Promise<Map<string, Claim>> {
  const map = new Map<string, Claim>();
  if (ids.length === 0) return map;
  const query = `?id=in.(${ids.map((id) => encodeURIComponent(id)).join(",")})&select=payload`;
  const response = await fetch(`${restUrl()}${query}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase read failed: ${response.status}`);
  const rows = (await response.json()) as { payload: Claim }[];
  for (const row of rows) {
    if (row.payload && typeof row.payload.id === "string") {
      map.set(row.payload.id, row.payload);
    }
  }
  return map;
}

export async function readSupabaseClaims(): Promise<Claim[]> {
  const response = await fetch(`${restUrl()}?select=payload&order=submitted_at.desc`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase read failed: ${response.status}`);
  const rows = (await response.json()) as { payload: Claim }[];
  return rows
    .map((row) => row.payload)
    .filter((claim) => claim && claim.isDeleted !== true);
}

export async function upsertSupabaseClaims(claims: Claim[]): Promise<Claim[]> {
  const valid = claims.filter(
    (claim): claim is Claim => Boolean(claim) && typeof claim.id === "string"
  );
  if (valid.length === 0) return [];

  return withLock(async () => {
    const existing = await readExistingPayloads(valid.map((claim) => claim.id));
    const merged = valid.map((claim) => {
      const stored = existing.get(claim.id);
      return stored ? mergeClaimPayload(stored, claim) : claim;
    });
    const rows = merged.map((claim) => ({
      id: claim.id,
      payload: claim,
      submitted_at: claim.submittedAt,
      updated_at: claim.updatedAt,
    }));
    const response = await fetch(restUrl(), {
      method: "POST",
      headers: headers("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify(rows),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Supabase write failed: ${response.status}`);
    return merged;
  });
}
