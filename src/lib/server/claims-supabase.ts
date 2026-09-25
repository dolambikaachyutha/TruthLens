import type { Claim } from "@/lib/types";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

export function isSupabaseClaimsConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function isSupabaseMutationsConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseSecretKey);
}

function headers(prefer?: string, write = false): HeadersInit {
  const key = write ? (supabaseSecretKey ?? supabasePublishableKey) : supabasePublishableKey;
  return {
    apikey: key ?? "",
    Authorization: `Bearer ${key ?? ""}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

function restUrl(): string {
  return `${supabaseUrl}/rest/v1/claims`;
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
 * A stored claims row: the database-generated `claims.id` plus the
 * application payload. `claims.id` is created by Supabase
 * (`gen_random_uuid()::text`), so it is read back from the row rather than
 * sent in an insert payload.
 */
type StoredClaimRow = { rowId: string; payload: Claim };

/**
 * Reads the current stored payloads for the given ids so incoming writes can
 * be merged instead of overwriting (overwriting the whole JSONB payload would
 * drop another browser's just-submitted review).
 *
 * Rows are looked up by the claim id inside `payload`, not by the `id`
 * column: the id column is generated by Supabase on insert and is no longer
 * part of the payload we send, so it cannot be the lookup key.
 */
async function readExistingPayloads(
  ids: string[]
): Promise<Map<string, StoredClaimRow>> {
  const map = new Map<string, StoredClaimRow>();
  if (ids.length === 0) return map;
  const query = `?payload->>id=in.(${ids.map((id) => encodeURIComponent(id)).join(",")})&select=id,payload`;
  const response = await fetch(`${restUrl()}${query}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase read failed: ${response.status}`);
  const rows = (await response.json()) as { id: string; payload: Claim }[];
  for (const row of rows) {
    if (
      typeof row.id === "string" &&
      row.payload &&
      typeof row.payload.id === "string"
    ) {
      map.set(row.payload.id, { rowId: row.id, payload: row.payload });
    }
  }
  return map;
}

function toRow(claim: Claim): Record<string, unknown> {
  // No `id` field: Supabase creates it (`claims.id` default
  // `gen_random_uuid()::text`) and returns it from the insert.
  return {
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
    payload: claim,
    submitted_at: claim.submittedAt,
    updated_at: claim.updatedAt,
  };
}

/**
 * Inserts claim rows without an `id` field — Supabase generates the id and
 * returns the row as `data.id`, which is the claimId any child rows
 * (risk_flags, reviews, evidence, timeline_events) would reference. This app
 * keeps those records inside the JSONB `payload`, so no child inserts run
 * today, but the generated ids are returned for them.
 */
async function insertRows(rows: Record<string, unknown>[]): Promise<string[]> {
  if (!supabaseSecretKey) {
    throw new Error("SUPABASE_SECRET_KEY is required for claim mutations.");
  }
  const response = await fetch(restUrl(), {
    method: "POST",
    headers: headers("return=representation", true),
    body: JSON.stringify(rows),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase write failed: ${response.status}`);
  const inserted = (await response.json().catch(() => [])) as {
    id?: string;
  }[];
  if (!Array.isArray(inserted)) return [];
  return inserted
    .map((row) => row.id)
    .filter((claimId): claimId is string => typeof claimId === "string");
}

/**
 * Updates an already-stored claims row by its database id so saves merge into
 * the same row instead of inserting a duplicate (the insert payload never
 * carries an id, so a fresh insert would always create a new row).
 * Returns false when the row no longer exists so the caller can re-insert.
 */
async function updateRow(
  rowId: string,
  row: Record<string, unknown>
): Promise<boolean> {
  if (!supabaseSecretKey) {
    throw new Error("SUPABASE_SECRET_KEY is required for claim mutations.");
  }
  const response = await fetch(
    `${restUrl()}?id=eq.${encodeURIComponent(rowId)}`,
    {
      method: "PATCH",
      headers: headers("return=representation", true),
      body: JSON.stringify(row),
      cache: "no-store",
    }
  );
  if (!response.ok) throw new Error(`Supabase update failed: ${response.status}`);
  const updated = (await response.json().catch(() => [])) as unknown[];
  return Array.isArray(updated) && updated.length > 0;
}

export async function readSupabaseClaims(): Promise<Claim[]> {
  const response = await fetch(
    `${restUrl()}?select=payload&order=submitted_at.desc`,
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
    const existing = await readExistingPayloads(valid.map((claim) => claim.id));
    const merged: Claim[] = [];
    const updates: { rowId: string; row: Record<string, unknown> }[] = [];
    const inserts: Record<string, unknown>[] = [];

    for (const claim of valid) {
      const stored = existing.get(claim.id);
      const next = stored ? mergeClaimPayload(stored.payload, claim) : claim;
      merged.push(next);
      if (stored) {
        updates.push({ rowId: stored.rowId, row: toRow(next) });
      } else {
        inserts.push(toRow(next));
      }
    }

    for (const update of updates) {
      const found = await updateRow(update.rowId, update.row);
      if (!found) inserts.push(update.row); // row vanished; recreate it
    }
    if (inserts.length > 0) {
      // Supabase generated these claim ids (data.id) on insert.
      await insertRows(inserts);
    }
    return merged;
  });
}
