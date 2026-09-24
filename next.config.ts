import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Security ──────────────────────────────────────────────────────────────
  // These headers are also set in vercel.json for Vercel deployments.
  // They apply here for any non-Vercel Node hosting.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // ── TypeScript ────────────────────────────────────────────────────────────
  typescript: {
    // Fail the build on type errors (CI safety net).
    ignoreBuildErrors: false,
  },
  // ── Performance ───────────────────────────────────────────────────────────
  // Compress responses at the edge.
  compress: true,

  // Powered-by header is unnecessary exposure.
  poweredByHeader: false,
};

export default nextConfig;
