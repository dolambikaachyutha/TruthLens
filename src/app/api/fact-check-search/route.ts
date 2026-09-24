import { NextResponse } from "next/server";
import { factCheckQuerySchema } from "@/lib/source-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 5000;

interface ExternalMatch {
  title: string;
  url: string;
  publisher: string;
  rating: string | null;
  reviewedAt: string | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = factCheckQuerySchema.safeParse({
    q: searchParams.get("q") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        configured: Boolean(
          process.env.GOOGLE_FACTCHECK_API_KEY ?? process.env.FACTCHECK_API_URL
        ),
        error:
          parsed.error.issues[0]?.message ?? "A q query parameter is required.",
        matches: [],
      },
      { status: 400 }
    );
  }

  const googleKey = process.env.GOOGLE_FACTCHECK_API_KEY;
  const endpoint = process.env.FACTCHECK_API_URL;

  if (!googleKey && !endpoint) {
    return NextResponse.json({
      ok: true,
      configured: false,
      matches: [],
      message: "External fact-check search is not configured.",
      retryable: false,
    });
  }

  try {
    let matches: ExternalMatch[] = [];

    if (googleKey) {
      const url = new URL(
        "https://factchecktools.googleapis.com/v1alpha1/claims:search"
      );
      url.searchParams.set("key", googleKey);
      url.searchParams.set("query", parsed.data.q);
      url.searchParams.set("languageCode", "en");
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
        .slice(0, 8);
    } else if (endpoint) {
      const url = new URL(endpoint);
      url.searchParams.set("query", parsed.data.q);
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as {
        matches?: ExternalMatch[];
      };
      matches = (data.matches ?? []).slice(0, 8);
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      matches,
      message:
        matches.length > 0
          ? "Related external checks found."
          : "No external references matched.",
      retryable: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        matches: [],
        error: message,
        message:
          "External fact-check search failed. This does not change any claim status.",
        retryable: true,
      },
      { status: 502 }
    );
  }
}
