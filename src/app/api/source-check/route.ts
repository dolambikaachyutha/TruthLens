import { NextResponse } from "next/server";
import {
  fetchSourceCheck,
  sourceCheckQuerySchema,
} from "@/lib/source-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = sourceCheckQuerySchema.safeParse({
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

  const result = await fetchSourceCheck(parsed.data.url);
  return NextResponse.json(result, {
    status: result.ok ? 200 : 422,
  });
}
