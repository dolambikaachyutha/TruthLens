import { NextResponse } from "next/server";
import { lookupWayback, waybackQuerySchema } from "@/lib/source-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = waybackQuerySchema.safeParse({
    url: searchParams.get("url") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error:
          parsed.error.issues[0]?.message ?? "A valid url query parameter is required.",
      },
      { status: 400 }
    );
  }

  const result = await lookupWayback(parsed.data.url);
  return NextResponse.json(
    {
      ...result,
      archived: Boolean(result.archiveUrl),
      message: result.archiveUrl
        ? "Archived reference found."
        : result.ok
          ? "No archived reference found."
          : (result.error ?? "Archive lookup failed."),
    },
    { status: result.ok ? 200 : 422 }
  );
}
