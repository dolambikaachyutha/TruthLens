import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for VerityQueue.
 *
 * Run tests:
 *   npx playwright test
 *
 * Run against a deployed preview:
 *   PLAYWRIGHT_BASE_URL=https://your-preview.vercel.app npx playwright test
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  // Local dev-server SSR + shared-API roundtrips can exceed Playwright's
  // default 30s under parallel load (cold Turbopack compiles included).
  timeout: 60_000,

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Always use a fresh storage state so localStorage doesn't leak between tests
    storageState: undefined,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  /* Start the Next.js dev server for local runs only. */
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
