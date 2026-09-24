import type { Claim } from "@/lib/types";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseClaimsConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

function headers(prefer?: string): HeadersInit {
  return {
    apikey: supabasePublishableKey ?? "",
    Authorization: `Bearer ${supabasePublishableKey ?? ""}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

/**
 * The canonical table is `public.claims` (see supabase/schema.sql). Until
 * that table has been migrated with its `payload` column, the store falls
 * back to `public.truthlens_claims`, which holds the same claim payloads.
 * The table is re-checked every minute so running schema.sql upgrades the
 * app automatically — no redeploy required.
 */
type ClaimsTable = "claims" | "truthlens_claims";

const TABLE_RECHECK_MS = 60_000;
let tableState: { table: ClaimsTable; checkedAt: number } | null = null;

function restUrlFor(table: ClaimsTable): string {
  return `${supabaseUrl}/rest/v1/${table}`;
}

function invalidateTable(): void {
  tableState = null;
}

async function resolveTable(): Promise<ClaimsTable> {
  const now = Date.now();
  if (tableState && now - tableState.checkedAt < TABLE_RECHECK_MS) {
    return tableState.table;
  }
  let table: ClaimsTable = "claims";
  try {
    const response = await fetch(
      `${restUrlFor("claims")}?select=payload&limit=1`,
      { headers: headers(), cache: "no-store" }
    );
    if (!response.ok) table = "truthlens_claims";
  } catch {
    table = "truthlens_claims";
  }
  tableState = { table, checkedAt: now };
  return table;
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
  const table = await resolveTable();
  const query = `?id=in.(${ids.map((id) => encodeURIComponent(id)).join(",")})&select=payload`;
  const response = await fetch(`${restUrlFor(table)}${query}`, {
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

function toRow(table: ClaimsTable, claim: Claim): Record<string, unknown> {
  const base = {
    id: claim.id,
    payload: claim,
    submitted_at: claim.submittedAt,
    updated_at: claim.updatedAt,
  };
  if (table === "truthlens_claims") return base;
  return {
    ...base,
    text: claim.body,
    platform: claim.platform ?? null,
    category: claim.category,
    source_url: claim.sourceUrl,
    status: claim.claimStatus,
    intake_status: claim.intakeStatus,
    automation_status: claim.automationStatus,
    risk_level: claim.riskLevel,
    automated_evidence_count: claim.automatedEvidenceCount,
    submitted_session_id: claim.submittedSessionId ?? null,
    intake_completed_at: claim.intakeCompletedAt,
    intake_error: claim.intakeError,
    is_visible_in_under_review: claim.isVisibleInUnderReview,
    is_visible_in_reviewed_feed: claim.isVisibleInReviewedFeed,
    is_deleted: claim.isDeleted === true,
  };
}

async function postRows(
  table: ClaimsTable,
  rows: Record<string, unknown>[]
): Promise<void> {
  const response = await fetch(restUrlFor(table), {
    method: "POST",
    headers: headers("resolution=merge-duplicates,return=minimal"),
    body: JSON.stringify(rows),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase write failed: ${response.status}`);
}

export async function readSupabaseClaims(): Promise<Claim[]> {
  const table = await resolveTable();
  const response = await fetch(
    `${restUrlFor(table)}?select=payload&order=submitted_at.desc`,
    {
      headers: headers(),
      cache: "no-store",
    }
  );
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
    const table = await resolveTable();
    const existing = await readExistingPayloads(valid.map((claim) => claim.id));
    const merged = valid.map((claim) => {
      const stored = existing.get(claim.id);
      return stored ? mergeClaimPayload(stored, claim) : claim;
    });
    const rows = merged.map((claim) => toRow(table, claim));
    try {
      await postRows(table, rows);
    } catch (error) {
      // If the canonical table is not migrated yet (or just changed), fall
      // back to the legacy payload table and re-check on the next request.
      if (table === "claims") {
        invalidateTable();
        await postRows("truthlens_claims", merged.map((c) => toRow("truthlens_claims", c)));
      } else {
        throw error;
      }
    }
    return merged;
  });
}
