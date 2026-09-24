import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Claim } from "@/lib/types";

const dataDirectory =
  process.env.CLAIMS_DATA_DIR ?? path.join(process.cwd(), "data");
const dataFile = path.join(dataDirectory, "claims.json");

let writeChain: Promise<unknown> = Promise.resolve();

function withLock<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task, task);
  writeChain = run.catch(() => undefined);
  return run;
}

export async function readClaims(): Promise<Claim[]> {
  try {
    const contents = await readFile(dataFile, "utf8");
    const parsed: unknown = JSON.parse(contents);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Claim[]).filter(
      (claim) => claim && typeof claim.id === "string"
    );
  } catch {
    return [];
  }
}

export async function writeClaims(claims: Claim[]): Promise<Claim[]> {
  return withLock(async () => {
    await mkdir(dataDirectory, { recursive: true });
    const sorted = [...claims].sort((a, b) =>
      (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")
    );
    await writeFile(dataFile, JSON.stringify(sorted, null, 2), "utf8");
    return sorted;
  });
}

function mergeByIdByIdentity<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of base) map.set(item.id, item);
  for (const item of extra) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
}

function mergeReviewHistory(
  a: Claim["reviewHistory"],
  b: Claim["reviewHistory"]
): Claim["reviewHistory"] {
  return mergeByIdByIdentity(a ?? [], b ?? []).sort((x, y) =>
    x.createdAt.localeCompare(y.createdAt)
  );
}

function mergeCommunityReviews(
  a: NonNullable<Claim["communityReviews"]>,
  b: NonNullable<Claim["communityReviews"]>
): NonNullable<Claim["communityReviews"]> {
  return mergeByIdByIdentity(a ?? [], b ?? []).sort((x, y) =>
    x.createdAt.localeCompare(y.createdAt)
  );
}

function mergeEvidence(
  a: Claim["evidence"],
  b: Claim["evidence"]
): Claim["evidence"] {
  return mergeByIdByIdentity(a ?? [], b ?? []);
}

function pickNewer(existing: Claim, incoming: Claim): Claim {
  const existingTime = Date.parse(existing.updatedAt || existing.submittedAt) || 0;
  const incomingTime = Date.parse(incoming.updatedAt || incoming.submittedAt) || 0;
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
    evidence: mergeEvidence(existing.evidence, incoming.evidence),
    reviewHistory: mergeReviewHistory(
      existing.reviewHistory,
      incoming.reviewHistory
    ),
    communityReviews: mergeCommunityReviews(
      existing.communityReviews ?? [],
      incoming.communityReviews ?? []
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
    publishedReview:
      existing.publishedReview ?? incoming.publishedReview ?? null,
    humanReview: existing.humanReview ?? incoming.humanReview ?? null,
    isDeleted: existing.isDeleted === true || incoming.isDeleted === true,
    deletedAt: existing.deletedAt ?? incoming.deletedAt ?? null,
    deletedReason: existing.deletedReason ?? incoming.deletedReason ?? null,
    deletedReasonDetail:
      existing.deletedReasonDetail ?? incoming.deletedReasonDetail ?? null,
    deletedBy: existing.deletedBy ?? incoming.deletedBy ?? null,
    updatedAt:
      incomingTime >= existingTime
        ? (incoming.updatedAt ?? existing.updatedAt)
        : (existing.updatedAt ?? incoming.updatedAt),
  };
}

export async function upsertClaim(incoming: Claim): Promise<Claim> {
  return withLock(async () => {
    const claims = await readClaims();
    const index = claims.findIndex((claim) => claim.id === incoming.id);
    if (index >= 0) {
      claims[index] = pickNewer(claims[index], incoming);
    } else {
      claims.push(incoming);
    }
    const sorted = claims.sort((a, b) =>
      (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")
    );
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(dataFile, JSON.stringify(sorted, null, 2), "utf8");
    return index >= 0 ? claims[index] : incoming;
  });
}

export async function upsertMany(incoming: Claim[]): Promise<Claim[]> {
  return withLock(async () => {
    let claims = await readClaims();
    for (const item of incoming) {
      if (!item || typeof item.id !== "string") continue;
      const index = claims.findIndex((claim) => claim.id === item.id);
      if (index >= 0) claims[index] = pickNewer(claims[index], item);
      else claims.push(item);
    }
    claims = claims.sort((a, b) =>
      (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")
    );
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(dataFile, JSON.stringify(claims, null, 2), "utf8");
    return claims;
  });
}
