import { z } from "zod";

export const SOURCE_CHECK_TIMEOUT_MS = 5000;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

function ipv4Parts(hostname: string): number[] | null {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return null;
  return match.slice(1, 5).map((p) => Number(p));
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = ipv4Parts(hostname);
  if (!parts || parts.some((p) => p > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (isPrivateIpv4(host)) return true;
  if (host.startsWith("[") && (host.includes("fc") || host.includes("fd") || host === "[::1]")) {
    return true;
  }
  return false;
}

export type SourceUrlValidation =
  | { ok: true; url: URL }
  | { ok: false; error: string };

export function validateSourceUrl(raw: string): SourceUrlValidation {
  const value = raw.trim();
  if (!value) {
    return { ok: false, error: "URL is required." };
  }
  if (/^(file|data|javascript|ftp|blob):/i.test(value)) {
    return {
      ok: false,
      error: "Only http:// and https:// URLs are allowed.",
    };
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: "URL is not valid." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http:// and https:// URLs are allowed." };
  }
  if (isBlockedHostname(url.hostname)) {
    return {
      ok: false,
      error: "Localhost and private network addresses are not allowed.",
    };
  }
  if (url.username || url.password) {
    return { ok: false, error: "Credentials in URLs are not allowed." };
  }
  return { ok: true, url };
}

export const sourceCheckQuerySchema = z.object({
  url: z.string().min(1, "url is required"),
});

export const waybackQuerySchema = z.object({
  url: z.string().min(1, "url is required"),
});

export const factCheckQuerySchema = z.object({
  q: z.string().min(2, "q must be at least 2 characters").max(300),
});

export interface SourceCheckResult {
  ok: boolean;
  error?: string;
  httpStatus: number | null;
  finalUrl: string | null;
  pageTitle: string | null;
  retrievedAt: string;
}

export async function fetchSourceCheck(
  rawUrl: string
): Promise<SourceCheckResult> {
  const retrievedAt = new Date().toISOString();
  const validation = validateSourceUrl(rawUrl);
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.error,
      httpStatus: null,
      finalUrl: null,
      pageTitle: null,
      retrievedAt,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(validation.url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "TruthLens-SourceCheck/1.0" },
    });

    let pageTitle: string | null = null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      const html = (await response.text()).slice(0, 200_000);
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch?.[1]) {
        pageTitle = titleMatch[1].replace(/\s+/g, " ").trim().slice(0, 200);
      }
    }

    return {
      ok: response.ok,
      error: response.ok
        ? undefined
        : `Source responded with HTTP ${response.status}.`,
      httpStatus: response.status,
      finalUrl: response.url,
      pageTitle,
      retrievedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Source check timed out."
        : "Source could not be checked. This does not prove the claim is false.";
    return {
      ok: false,
      error: message,
      httpStatus: null,
      finalUrl: null,
      pageTitle: null,
      retrievedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface WaybackResult {
  ok: boolean;
  error?: string;
  archiveUrl: string | null;
  timestamp: string | null;
  checkedAt: string;
}

export async function lookupWayback(rawUrl: string): Promise<WaybackResult> {
  const checkedAt = new Date().toISOString();
  const validation = validateSourceUrl(rawUrl);
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.error,
      archiveUrl: null,
      timestamp: null,
      checkedAt,
    };
  }

  try {
    const waybackApi = `https://archive.org/wayback/available?url=${encodeURIComponent(
      validation.url.toString()
    )}`;
    const response = await fetch(waybackApi, {
      signal: AbortSignal.timeout(SOURCE_CHECK_TIMEOUT_MS),
      headers: { "User-Agent": "TruthLens-Wayback/1.0" },
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `Wayback availability check returned HTTP ${response.status}.`,
        archiveUrl: null,
        timestamp: null,
        checkedAt,
      };
    }
    const data = (await response.json()) as {
      archived_snapshots?: { closest?: { url?: string; timestamp?: string } };
    };
    const snapshot = data.archived_snapshots?.closest;
    if (snapshot?.url) {
      return {
        ok: true,
        archiveUrl: snapshot.url,
        timestamp: snapshot.timestamp ?? null,
        checkedAt,
      };
    }
    return {
      ok: true,
      archiveUrl: null,
      timestamp: null,
      checkedAt,
    };
  } catch {
    return {
      ok: false,
      error: "Wayback availability check failed.",
      archiveUrl: null,
      timestamp: null,
      checkedAt,
    };
  }
}
