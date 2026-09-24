import type { ClaimCategory, Platform, SubmissionRecord } from "@/lib/types";
import { analyzeClaim } from "@/lib/risk-analysis";

const STORAGE_KEY = "vq.submissions.v1";
const LEGACY_SEED_PREFIX = "sub-seed-";

/** True only in browser environments with localStorage available. */
function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Reads locally saved submissions.
 * Legacy seed records (written by older builds) are silently filtered out on
 * first read so returning visitors are cleaned up automatically.
 */
export function listSubmissions(): SubmissionRecord[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as SubmissionRecord[]).filter(
      (record) =>
        record !== null &&
        typeof record === "object" &&
        typeof record.id === "string" &&
        !record.id.startsWith(LEGACY_SEED_PREFIX)
    );
  } catch {
    return [];
  }
}

export interface SaveSubmissionInput {
  claimText: string;
  platform: Platform;
  category: ClaimCategory;
  sourceUrl: string | null;
}

/**
 * Analyses the claim text and persists the result to localStorage.
 * Returns the saved record regardless of whether the write succeeded (storage
 * may be full or disabled in private-browsing mode).
 *
 * Uses seeded mock persistence until a real Supabase integration is added.
 */
export function saveSubmission(input: SaveSubmissionInput): SubmissionRecord {
  // Analyse before reading storage to keep the write path as short as possible.
  const analysis = analyzeClaim({
    claimText: input.claimText,
    sourceUrl: input.sourceUrl,
  });

  const createdAt = new Date().toISOString();
  const record: SubmissionRecord = {
    id: `sub-local-${Date.now()}`,
    claimText: input.claimText,
    platform: input.platform,
    category: input.category,
    sourceUrl: input.sourceUrl,
    flags: analysis.flags,
    riskLevel: analysis.riskLevel,
    status: "unverified",
    createdAt,
  };

  if (hasStorage()) {
    try {
      const existing = listSubmissions();
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([record, ...existing])
      );
    } catch {
      // Storage full or access denied — return the record anyway.
    }
  }

  return record;
}
