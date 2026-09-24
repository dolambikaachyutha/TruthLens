import { NextResponse } from "next/server";
import {
  claimFormatJob,
  decideIntakeStatus,
  duplicateClaimsJob,
  findSimilarClaims,
  jobsToIntakeChecks,
  noSourceJobs,
  presentationSignalJob,
  similarClaimsJob,
  spamAbusePiiJob,
  type EvidenceDeskRequest,
  type EvidenceDeskResponse,
  type EvidenceJobResult,
} from "@/lib/automation";
import {
  fetchSourceCheck,
  lookupWayback,
} from "@/lib/source-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 8000;

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function checkSource(
  sourceUrl: string
): Promise<{
  reachability: EvidenceJobResult;
  metadata: EvidenceJobResult;
  archive: EvidenceJobResult;
  pageTitle: string | null;
}> {
  const sourceResult = await fetchSourceCheck(sourceUrl);
  const waybackResult = await lookupWayback(sourceUrl);

  const reachability: EvidenceJobResult = {
    kind: "source_reachability",
    title: "Source reachability",
    status: sourceResult.ok
      ? "ok"
      : sourceResult.error &&
          sourceResult.error.includes("does not prove")
        ? "error"
        : sourceResult.httpStatus
          ? "warn"
          : "error",
    summary: sourceResult.ok
      ? `Source is reachable (HTTP ${sourceResult.httpStatus}).`
      : (sourceResult.error ??
          "Source could not be checked. This does not prove the claim is false."),
    url: sourceUrl,
    httpStatus: sourceResult.httpStatus,
    finalUrl: sourceResult.finalUrl,
    createdAt: sourceResult.retrievedAt,
  };

  if (!isValidHttpUrl(sourceUrl)) {
    return {
      reachability: {
        ...reachability,
        status: "error",
        summary: "Source URL is not a valid http(s) address.",
      },
      metadata: {
        kind: "source_metadata",
        title: "Source metadata",
        status: "skipped",
        summary: "Skipped — invalid source URL.",
        url: sourceUrl,
      },
      archive: {
        kind: "wayback_archive",
        title: "Wayback archive",
        status: "skipped",
        summary: "Skipped — invalid source URL.",
        url: sourceUrl,
      },
      pageTitle: null,
    };
  }

  let metadata: EvidenceJobResult;
  if (sourceResult.pageTitle) {
    metadata = {
      kind: "source_metadata",
      title: "Source metadata",
      status: "ok",
      summary: `Page title: “${sourceResult.pageTitle}”`,
      detail: `Final URL: ${sourceResult.finalUrl ?? sourceUrl}`,
      url: sourceResult.finalUrl ?? sourceUrl,
      finalUrl: sourceResult.finalUrl,
      httpStatus: sourceResult.httpStatus,
      createdAt: sourceResult.retrievedAt,
    };
  } else if (sourceResult.ok) {
    metadata = {
      kind: "source_metadata",
      title: "Source metadata",
      status: "warn",
      summary: "Source responded but no HTML title was found.",
      url: sourceResult.finalUrl ?? sourceUrl,
      httpStatus: sourceResult.httpStatus,
      createdAt: sourceResult.retrievedAt,
    };
  } else {
    metadata = {
      kind: "source_metadata",
      title: "Source metadata",
      status: "error",
      summary: "Metadata fetch skipped — source unreachable.",
      url: sourceUrl,
      createdAt: sourceResult.retrievedAt,
    };
  }

  let archive: EvidenceJobResult;
  if (waybackResult.ok && waybackResult.archiveUrl) {
    archive = {
      kind: "wayback_archive",
      title: "Wayback archive",
      status: "ok",
      summary: "Archived reference found.",
      url: waybackResult.archiveUrl,
      archiveUrl: waybackResult.archiveUrl,
      isArchived: true,
      detail: waybackResult.timestamp
        ? `Snapshot timestamp: ${waybackResult.timestamp}`
        : undefined,
      createdAt: waybackResult.checkedAt,
    };
  } else if (waybackResult.ok) {
    archive = {
      kind: "wayback_archive",
      title: "Wayback archive",
      status: "skipped",
      summary: "No archived reference found.",
      url: `https://web.archive.org/web/*/${sourceUrl}`,
      isArchived: false,
      createdAt: waybackResult.checkedAt,
    };
  } else {
    archive = {
      kind: "wayback_archive",
      title: "Wayback archive",
      status: "warn",
      summary:
        waybackResult.error ?? "Wayback availability check could not finish.",
      url: `https://web.archive.org/web/*/${sourceUrl}`,
      isArchived: false,
      createdAt: waybackResult.checkedAt,
    };
  }

  return { reachability, metadata, archive, pageTitle: sourceResult.pageTitle };
}

async function searchFactChecks(
  query: string
): Promise<{
  configured: boolean;
  matches: EvidenceDeskResponse["factCheckMatches"];
  job: EvidenceJobResult;
}> {
  const googleKey = process.env.GOOGLE_FACTCHECK_API_KEY;
  const endpoint = process.env.FACTCHECK_API_URL;

  if (!googleKey && !endpoint) {
    return {
      configured: false,
      matches: [],
      job: {
        kind: "fact_check_search",
        title: "External fact-check references",
        status: "skipped",
        summary:
          "External fact-check search is not configured for this deployment.",
        detail:
          "Set GOOGLE_FACTCHECK_API_KEY to enable external reference lookup. Ratings are never copied into claim status.",
        isExternalFactCheck: true,
      },
    };
  }

  try {
    let matches: EvidenceDeskResponse["factCheckMatches"] = [];

    if (googleKey) {
      const url = new URL(
        "https://factchecktools.googleapis.com/v1alpha1/claims:search"
      );
      url.searchParams.set("key", googleKey);
      url.searchParams.set("query", query.slice(0, 300));
      url.searchParams.set("languageCode", "en");
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        claims?: {
          text?: string;
          claimReview?: {
            publisher?: { name?: string };
            title?: string;
            url?: string;
            reviewDate?: string;
            textualRating?: string;
          }[];
        }[];
      };
      matches = (data.claims ?? [])
        .flatMap((claim) =>
          (claim.claimReview ?? []).map((review) => ({
            title: review.title ?? claim.text ?? "External review",
            url: review.url ?? "",
            publisher: review.publisher?.name ?? "External source",
            rating: review.textualRating ?? null,
            reviewedAt: review.reviewDate ?? null,
          }))
        )
        .filter((m) => m.title && m.url)
        .slice(0, 5);
    } else if (endpoint) {
      const url = new URL(endpoint);
      url.searchParams.set("query", query.slice(0, 300));
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        matches?: {
          title?: string;
          url?: string;
          publisher?: string;
          rating?: string;
          reviewedAt?: string;
        }[];
      };
      matches = (data.matches ?? [])
        .filter((m) => m.title && m.url)
        .slice(0, 5)
        .map((m) => ({
          title: String(m.title),
          url: String(m.url),
          publisher: m.publisher ? String(m.publisher) : "External source",
          rating: m.rating ?? null,
          reviewedAt: m.reviewedAt ?? null,
        }));
    }

    return {
      configured: true,
      matches,
      job: {
        kind: "fact_check_search",
        title: "External fact-check references",
        status: matches.length > 0 ? "ok" : "skipped",
        summary:
          matches.length > 0
            ? `${matches.length} related external check${
                matches.length === 1 ? "" : "s"
              } found. These are External references only — not this platform's status.`
            : "Search configured, but no external references matched.",
        detail: matches
          .map((m) => `External reference — ${m.publisher}: ${m.title}`)
          .join(" · "),
        isExternalFactCheck: true,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      configured: true,
      matches: [],
      job: {
        kind: "fact_check_search",
        title: "External fact-check references",
        status: "error",
        summary: `External fact-check search failed (${message}).`,
        detail:
          "A Retry is available from the evidence desk. Claim status is unaffected by external ratings.",
        isExternalFactCheck: true,
      },
    };
  }
}

export async function POST(request: Request) {
  let body: EvidenceDeskRequest;
  try {
    body = (await request.json()) as EvidenceDeskRequest;
  } catch {
    return NextResponse.json<EvidenceDeskResponse>(
      {
        ok: false,
        error: "Invalid JSON body.",
        jobs: [],
        factCheckMatches: [],
        factCheckConfigured: false,
      },
      { status: 400 }
    );
  }

  const claimId = body.claimId ?? "unknown";
  const claimText = (body.claimText ?? "").trim();
  const sourceUrl = body.sourceUrl?.trim() || null;
  const similarPool = body.similarPool ?? [];

  if (!claimText) {
    return NextResponse.json<EvidenceDeskResponse>(
      {
        ok: false,
        error: "claimText is required.",
        jobs: [],
        factCheckMatches: [],
        factCheckConfigured: false,
      },
      { status: 400 }
    );
  }

  if (body.forceFail) {
    return NextResponse.json<EvidenceDeskResponse>(
      {
        ok: false,
        error: "Forced automation failure for testing.",
        jobs: [],
        factCheckMatches: [],
        factCheckConfigured: Boolean(
          process.env.GOOGLE_FACTCHECK_API_KEY ?? process.env.FACTCHECK_API_URL
        ),
        intakeStatus: "failed",
      },
      { status: 500 }
    );
  }

  try {
    const formatJob = claimFormatJob(claimText);
    const abuseJob = spamAbusePiiJob(claimText);
    const jobs: EvidenceJobResult[] = [
      formatJob,
      abuseJob,
      presentationSignalJob(claimText),
      duplicateClaimsJob(claimId, claimText, similarPool),
    ];

    if (abuseJob.status === "error") {
      const intake = decideIntakeStatus(jobs);
      return NextResponse.json<EvidenceDeskResponse>({
        ok: true,
        jobs,
        factCheckMatches: [],
        factCheckConfigured: Boolean(
          process.env.GOOGLE_FACTCHECK_API_KEY ?? process.env.FACTCHECK_API_URL
        ),
        intakeStatus: intake.intakeStatus,
        intakeChecks: jobsToIntakeChecks(claimId, jobs),
      });
    }

    if (!sourceUrl) {
      jobs.push(...noSourceJobs());
      const similar = similarClaimsJob(claimId, claimText, similarPool);
      jobs.push(similar);
      const intake = decideIntakeStatus(jobs);
      return NextResponse.json<EvidenceDeskResponse>({
        ok: true,
        jobs,
        factCheckMatches: [],
        factCheckConfigured: Boolean(
          process.env.GOOGLE_FACTCHECK_API_KEY ?? process.env.FACTCHECK_API_URL
        ),
        intakeStatus: intake.intakeStatus,
        intakeChecks: jobsToIntakeChecks(claimId, jobs),
      });
    }

    const { reachability, metadata, archive } = await checkSource(sourceUrl);
    jobs.push(reachability, metadata, archive);

    const factQuery = metadata.summary.includes("Page title")
      ? `${metadata.summary.replace("Page title: ", "")} ${claimText}`
      : claimText;
    const fact = await searchFactChecks(factQuery);
    jobs.push(fact.job);

    jobs.push(similarClaimsJob(claimId, claimText, similarPool));

    const intake = decideIntakeStatus(jobs);

    return NextResponse.json<EvidenceDeskResponse>({
      ok: true,
      jobs,
      factCheckMatches: fact.matches,
      factCheckConfigured: fact.configured,
      intakeStatus: intake.intakeStatus,
      intakeChecks: jobsToIntakeChecks(claimId, jobs),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json<EvidenceDeskResponse>(
      {
        ok: false,
        error: message,
        jobs: [],
        factCheckMatches: [],
        factCheckConfigured: Boolean(
          process.env.GOOGLE_FACTCHECK_API_KEY ?? process.env.FACTCHECK_API_URL
        ),
        intakeStatus: "failed",
      },
      { status: 500 }
    );
  }
}

export { findSimilarClaims };
