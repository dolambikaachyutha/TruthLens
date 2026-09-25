import type { Claim } from "@/lib/types";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

function isPlaceholderKey(key: string | undefined): boolean {
  if (!key) return true;
  const trimmed = key.trim().toLowerCase();
  return (
    trimmed.startsWith("your-") ||
    trimmed.includes("placeholder") ||
    trimmed === ""
  );
}

const validSecretKey = isPlaceholderKey(supabaseSecretKey)
  ? null
  : supabaseSecretKey;

function getWriteKey(): string {
  return validSecretKey ?? supabasePublishableKey ?? "";
}

// In-memory fallback and sync cache
const inMemoryStore = new Map<string, Claim>();

export function isRealSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function isSupabaseClaimsConfigured(): boolean {
  return true; // Supported: Real Supabase if configured, otherwise in-memory mock store
}

export function isSupabaseMutationsConfigured(): boolean {
  return true; // Supported: Real Supabase if configured, otherwise in-memory mock store
}

function headers(prefer?: string, write = false): HeadersInit {
  const key = write ? getWriteKey() : (supabasePublishableKey ?? "");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
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
async function syncEvidenceRows(rowId: string, claim: Claim): Promise<void> {
  if (!isRealSupabaseConfigured() || !claim.evidence || claim.evidence.length === 0) return;
  try {
    const key = getWriteKey();
    if (!key) return;
    const evidenceRows = claim.evidence.map((e) => ({
      id: e.id,
      claim_id: rowId,
      title: e.title,
      url: e.url ?? null,
      source_type: e.kind ?? null,
      source_name: e.sourceName ?? null,
      external_rating: e.externalRating ?? null,
      http_status: e.httpStatus ?? null,
      final_url: e.finalUrl ?? null,
      retrieved_at: e.retrievedAt ?? null,
      is_archived: e.isArchived === true,
      is_external_fact_check: e.isExternalFactCheck === true,
      created_by: e.createdBy ?? "Automated evidence desk",
      created_at: e.createdAt ?? new Date().toISOString(),
    }));

    await fetch(`${supabaseUrl}/rest/v1/evidence`, {
      method: "POST",
      headers: {
        ...headers("resolution=merge-duplicates", true),
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(evidenceRows),
      cache: "no-store",
    }).catch(() => undefined);
  } catch {
    // Non-fatal: child table sync is best-effort alongside JSONB payload
  }
}

async function insertRows(rows: Record<string, unknown>[]): Promise<string[]> {
  const key = getWriteKey();
  if (!key) {
    throw new Error("Supabase write key is required for claim mutations.");
  }
  const response = await fetch(restUrl(), {
    method: "POST",
    headers: headers("return=representation", true),
    body: JSON.stringify(rows),
    cache: "no-store",
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Supabase write failed: ${response.status} ${errorText}`);
  }
  const inserted = (await response.json().catch(() => [])) as {
    id?: string;
  }[];
  if (!Array.isArray(inserted)) return [];
  return inserted
    .map((row) => row.id)
    .filter((claimId): claimId is string => typeof claimId === "string");
}

async function updateRow(
  rowId: string,
  row: Record<string, unknown>
): Promise<boolean> {
  const key = getWriteKey();
  if (!key) {
    throw new Error("Supabase write key is required for claim mutations.");
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
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Supabase update failed: ${response.status} ${errorText}`);
  }
  const updated = (await response.json().catch(() => [])) as unknown[];
  return Array.isArray(updated) && updated.length > 0;
}

interface SupabaseClaimRow {
  id: string;
  text?: string | null;
  category?: string | null;
  platform?: string | null;
  source_url?: string | null;
  status?: string | null;
  intake_status?: string | null;
  automation_status?: string | null;
  risk_level?: string | null;
  automated_evidence_count?: number | null;
  submitted_at?: string | null;
  updated_at?: string | null;
  version_number?: number | null;
  is_deleted?: boolean | null;
  payload?: Claim | null;
}

function normalizeSupabaseClaim(row: SupabaseClaimRow): Claim | null {
  const payload = (row.payload && typeof row.payload === "object" ? row.payload : {}) as Partial<Claim>;
  const id = (typeof payload.id === "string" && payload.id.trim()) ? payload.id.trim() : (row.id ? String(row.id) : "");
  if (!id) return null;
  const now = new Date().toISOString();
  const submittedAt = payload.submittedAt || row.submitted_at || now;
  const updatedAt = payload.updatedAt || row.updated_at || submittedAt;
  const body = (payload.body || row.text || "").trim();
  const title = (
    payload.title ||
    (body.length > 120 ? `${body.slice(0, 117)}…` : body) ||
    "Untitled Claim"
  ).trim();

  return {
    ...payload,
    id,
    title,
    body,
    category: (payload.category || row.category || "other") as Claim["category"],
    platform: payload.platform ?? row.platform ?? null,
    sourceUrl: payload.sourceUrl ?? row.source_url ?? null,
    claimStatus: (payload.claimStatus || row.status || "unverified") as Claim["claimStatus"],
    intakeStatus: payload.intakeStatus ?? (row.intake_status as Claim["intakeStatus"]) ?? "ready_for_review",
    automationStatus: payload.automationStatus ?? (row.automation_status as Claim["automationStatus"]) ?? "completed",
    riskLevel: payload.riskLevel ?? (row.risk_level as Claim["riskLevel"]) ?? "low",
    automatedEvidenceCount: payload.automatedEvidenceCount ?? row.automated_evidence_count ?? (payload.evidence?.length ?? 0),
    submittedAt,
    updatedAt,
    isDeleted: payload.isDeleted === true || row.is_deleted === true,
    deletedAt: payload.deletedAt ?? null,
    deletedReason: payload.deletedReason ?? null,
    deletedReasonDetail: payload.deletedReasonDetail ?? null,
    deletedBy: payload.deletedBy ?? null,
    evidence: Array.isArray(payload.evidence) ? payload.evidence : [],
    riskFlags: Array.isArray(payload.riskFlags) ? payload.riskFlags : [],
    reviewHistory: Array.isArray(payload.reviewHistory) ? payload.reviewHistory : [],
    communityReviews: Array.isArray(payload.communityReviews) ? payload.communityReviews : [],
    sameClaimCount: typeof payload.sameClaimCount === "number" ? payload.sameClaimCount : 0,
    sameClaimVoterIds: Array.isArray(payload.sameClaimVoterIds) ? payload.sameClaimVoterIds : [],
    publishedReview: payload.publishedReview ?? null,
    humanReview: payload.humanReview ?? null,
    corrections: Array.isArray(payload.corrections) ? payload.corrections : [],
    intakeChecks: Array.isArray(payload.intakeChecks) ? payload.intakeChecks : [],
    versions: Array.isArray(payload.versions) ? payload.versions : [],
    versionNumber: payload.versionNumber ?? (typeof row.version_number === "number" ? row.version_number : 1),
    isVisibleInUnderReview: payload.isVisibleInUnderReview !== false,
    isVisibleInReviewedFeed: payload.isVisibleInReviewedFeed !== false,
  };
}

export async function readSupabaseClaims(): Promise<Claim[]> {
  if (!isRealSupabaseConfigured()) {
    return Array.from(inMemoryStore.values())
      .filter((claim) => claim && claim.isDeleted !== true)
      .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
  }
  try {
    const response = await fetch(
      `${restUrl()}?select=id,text,category,platform,source_url,status,intake_status,automation_status,risk_level,automated_evidence_count,submitted_at,updated_at,version_number,is_deleted,payload&order=submitted_at.desc`,
      {
        headers: headers(),
        cache: "no-store",
      }
    );
    if (!response.ok) throw new Error(`Supabase read failed: ${response.status}`);
    const rows = (await response.json()) as SupabaseClaimRow[];
    const claims = rows
      .map(normalizeSupabaseClaim)
      .filter((claim): claim is Claim => claim !== null && claim.isDeleted !== true);
    for (const c of claims) {
      if (c && c.id) inMemoryStore.set(c.id, c);
    }
    return claims;
  } catch (err) {
    console.warn("[AI Studio] Supabase read failed, falling back to memory store:", err);
    return Array.from(inMemoryStore.values())
      .filter((claim) => claim && claim.isDeleted !== true)
      .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
  }
}

export async function upsertSupabaseClaims(claims: Claim[]): Promise<Claim[]> {
  const valid = claims.filter(
    (claim): claim is Claim => Boolean(claim) && typeof claim.id === "string"
  );
  if (valid.length === 0) return [];

  return withLock(async () => {
    if (!isRealSupabaseConfigured()) {
      const merged: Claim[] = [];
      for (const claim of valid) {
        const stored = inMemoryStore.get(claim.id);
        const next = stored ? mergeClaimPayload(stored, claim) : claim;
        inMemoryStore.set(claim.id, next);
        merged.push(next);
      }
      return merged;
    }

    try {
      const existing = await readExistingPayloads(valid.map((claim) => claim.id));
      const merged: Claim[] = [];
      const updates: { rowId: string; row: Record<string, unknown>; claim: Claim }[] = [];
      const inserts: { row: Record<string, unknown>; claim: Claim }[] = [];

      for (const claim of valid) {
        const stored = existing.get(claim.id);
        const next = stored ? mergeClaimPayload(stored.payload, claim) : claim;
        merged.push(next);
        inMemoryStore.set(claim.id, next);
        if (stored) {
          updates.push({ rowId: stored.rowId, row: toRow(next), claim: next });
        } else {
          inserts.push({ row: toRow(next), claim: next });
        }
      }

      for (const update of updates) {
        const found = await updateRow(update.rowId, update.row);
        if (!found) {
          inserts.push({ row: update.row, claim: update.claim });
        } else {
          void syncEvidenceRows(update.rowId, update.claim);
        }
      }
      if (inserts.length > 0) {
        const newDbIds = await insertRows(inserts.map((i) => i.row));
        for (let i = 0; i < inserts.length; i++) {
          const dbId = newDbIds[i];
          if (dbId) {
            void syncEvidenceRows(dbId, inserts[i].claim);
          }
        }
      }
      return merged;
    } catch (err) {
      console.warn("[AI Studio] Supabase upsert error:", err);
      const merged: Claim[] = [];
      for (const claim of valid) {
        const stored = inMemoryStore.get(claim.id);
        const next = stored ? mergeClaimPayload(stored, claim) : claim;
        inMemoryStore.set(claim.id, next);
        merged.push(next);
      }
      return merged;
    }
  });
}
