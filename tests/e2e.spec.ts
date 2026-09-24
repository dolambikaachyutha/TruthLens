/**
 * VerityQueue — End-to-End Tests (Playwright)
 *
 * Covers the exact test scenario from AGENTS.md:
 *   Claim text : "BREAKING SHOCKING NEWS SHARE BEFORE DELETED"
 *   Source URL : (none)
 *   Category   : Politics
 *   Platform   : WhatsApp
 *
 * Expected flags:
 *   ✓ Sensational language  (BREAKING, SHOCKING, SHARE BEFORE DELETED)
 *   ✓ Shouting              (>50% uppercase alphabetic chars)
 *   ✓ Unsourced             (no source URL provided)
 *   → Two or more flags → High Risk
 *
 * Additional coverage:
 *   - Form validation (required fields)
 *   - Successful submission
 *   - Feed page renders
 *   - Claim detail with delete button
 *   - Delete flow (two-step confirmation)
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fillAndSubmitClaim(
  page: Page,
  opts: {
    claimText: string;
    platform: string;
    category: string;
    sourceUrl?: string;
  }
) {
  await page.goto(`${BASE_URL}/submit`);
  await page.waitForLoadState("domcontentloaded");

  // Fill claim text
  await page.getByLabel(/claim text/i).fill(opts.claimText);

  // Select platform
  await page.getByLabel(/platform/i).click();
  await page.getByRole("option", { name: new RegExp(opts.platform, "i") }).click();

  // Select category
  await page.getByLabel(/category/i).click();
  await page.getByRole("option", { name: new RegExp(opts.category, "i") }).click();

  // Fill source URL if provided
  if (opts.sourceUrl) {
    await page.getByLabel(/source url/i).fill(opts.sourceUrl);
  }
}

// ---------------------------------------------------------------------------
// Risk analysis — required by AGENTS.md test specification
// ---------------------------------------------------------------------------

test.describe("Risk analysis — AGENTS.md test case", () => {
  test("BREAKING SHOCKING NEWS SHARE BEFORE DELETED triggers Sensational + Shouting + Unsourced → High Risk", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/submit`);
    await page.waitForLoadState("domcontentloaded");

    const claimText = "BREAKING SHOCKING NEWS SHARE BEFORE DELETED";

    // Type the claim text — risk panel updates live
    await page.getByLabel(/claim text/i).fill(claimText);

    // ── Risk panel assertions ──
    const panel = page.getByLabel(/live triage signal analysis/i);
    await expect(panel).toBeVisible();

    // Sensational language flag must appear
    await expect(panel.getByText(/sensational language/i)).toBeVisible();

    // Shouting flag must appear (>50% uppercase)
    await expect(panel.getByText(/shouting/i)).toBeVisible();

    // Unsourced flag must appear (no source URL provided)
    await expect(panel.getByText(/unsourced/i)).toBeVisible();

    // Risk level badge must read "High risk" (≥2 flags)
    await expect(panel.getByText(/high risk/i)).toBeVisible();

    // Uppercase ratio stat must be present and above 50%
    const ratioStat = panel.getByText(/uppercase letters:/i);
    await expect(ratioStat).toBeVisible();
    const ratioText = await ratioStat.textContent();
    const match = ratioText?.match(/(\d+)%/);
    expect(match).toBeTruthy();
    expect(parseInt(match![1], 10)).toBeGreaterThan(50);
  });

  test("Flags display rationale that explicitly states they are not verdicts", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/submit`);
    await page.getByLabel(/claim text/i).fill("BREAKING NEWS");

    const panel = page.getByLabel(/live triage signal analysis/i);

    // Every flag must include "not a judgment of truth" or similar in its rationale
    await expect(
      panel.getByText(/not a judgment of truth/i).first()
    ).toBeVisible();
  });

  test("Live region announces flag count to assistive technology", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/submit`);
    await page.getByLabel(/claim text/i).fill("BREAKING urgent");

    const liveRegion = page.getByTestId("risk-panel-live-region");
    await expect(liveRegion).toBeAttached();
    const content = await liveRegion.textContent();
    expect(content).toMatch(/signal/i);
  });
});

// ---------------------------------------------------------------------------
// Form validation
// ---------------------------------------------------------------------------

test.describe("Submission form — validation", () => {
  test("Submitting empty form shows required field errors", async ({ page }) => {
    await page.goto(`${BASE_URL}/submit`);
    await page.getByRole("button", { name: /submit claim/i }).click();

    // Claim text is required
    await expect(page.getByText(/at least 10 characters/i)).toBeVisible();
  });

  test("Platform is required", async ({ page }) => {
    await page.goto(`${BASE_URL}/submit`);
    await page.getByLabel(/claim text/i).fill("This is a test claim text long enough");
    await page.getByRole("button", { name: /submit claim/i }).click();

    await expect(page.getByText(/platform is required/i)).toBeVisible();
  });

  test("Category is required", async ({ page }) => {
    await page.goto(`${BASE_URL}/submit`);
    await page.getByLabel(/claim text/i).fill("This is a test claim text long enough");

    // Select platform but not category
    await page.getByLabel(/platform/i).click();
    await page.getByRole("option", { name: /whatsapp/i }).click();

    await page.getByRole("button", { name: /submit claim/i }).click();
    await expect(page.getByText(/category is required/i)).toBeVisible();
  });

  test("Invalid source URL shows validation error", async ({ page }) => {
    await page.goto(`${BASE_URL}/submit`);
    await page.getByLabel(/source url/i).fill("not-a-url");
    // Trigger blur to run validation
    await page.getByLabel(/claim text/i).click();

    await expect(page.getByText(/must start with http/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Happy path — successful submission
// ---------------------------------------------------------------------------

test.describe("Submission — happy path", () => {
  test("Submitting the AGENTS.md test case saves the claim and shows success state", async ({
    page,
  }) => {
    await fillAndSubmitClaim(page, {
      claimText: "BREAKING SHOCKING NEWS SHARE BEFORE DELETED",
      platform: "WhatsApp",
      category: "Politics",
      // No source URL — tests the Unsourced flag
    });

    await page.getByRole("button", { name: /submit claim/i }).click();

    // Success panel must appear
    await expect(page.getByTestId("submit-success")).toBeVisible({ timeout: 5000 });

    // Success panel must show the High Risk badge
    await expect(page.getByText(/high risk/i)).toBeVisible();

    // View claim link must be present
    await expect(page.getByTestId("view-claim")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Feed page
// ---------------------------------------------------------------------------

test.describe("Feed page", () => {
  test("Feed page renders with a heading", async ({ page }) => {
    await page.goto(`${BASE_URL}/feed`);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /claims feed/i })).toBeVisible();
  });

  test("Filter controls are present and accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/feed`);
    await page.waitForLoadState("domcontentloaded");
    // Status and category filters must be accessible
    await expect(page.getByRole("combobox").first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Delete flow
// ---------------------------------------------------------------------------

test.describe("Delete claim — two-step confirmation", () => {
  test("Delete button requires confirmation before removing", async ({ page }) => {
    // First submit a claim so we have something to delete
    await fillAndSubmitClaim(page, {
      claimText: "Test claim for deletion testing purpose only",
      platform: "WhatsApp",
      category: "Politics",
    });
    await page.getByRole("button", { name: /submit claim/i }).click();
    await page.getByTestId("view-claim").click();

    // Delete button must be present on unverified claims
    const deleteBtn = page.getByTestId("delete-claim-btn");
    await expect(deleteBtn).toBeVisible();

    // Clicking shows confirmation — not immediate
    await deleteBtn.click();
    await expect(page.getByTestId("delete-claim-confirm")).toBeVisible();
    await expect(page.getByTestId("delete-claim-cancel")).toBeVisible();
  });

  test("Cancel dismisses the confirmation panel", async ({ page }) => {
    await fillAndSubmitClaim(page, {
      claimText: "Test claim cancel deletion test scenario here",
      platform: "Facebook",
      category: "Health",
    });
    await page.getByRole("button", { name: /submit claim/i }).click();
    await page.getByTestId("view-claim").click();

    await page.getByTestId("delete-claim-btn").click();
    await page.getByTestId("delete-claim-cancel").click();

    // Confirm panel gone; primary delete button is back
    await expect(page.getByTestId("delete-claim-confirm")).not.toBeVisible();
    await expect(page.getByTestId("delete-claim-btn")).toBeVisible();
  });

  test("Confirming deletion navigates to feed", async ({ page }) => {
    await fillAndSubmitClaim(page, {
      claimText: "Test claim for final deletion confirmation please work",
      platform: "Telegram",
      category: "Finance",
    });
    await page.getByRole("button", { name: /submit claim/i }).click();
    await page.getByTestId("view-claim").click();

    await page.getByTestId("delete-claim-btn").click();
    await page.getByTestId("delete-claim-confirm").click();

    // After deletion the user should land on /feed
    await page.waitForURL(/\/feed/, { timeout: 5000 });
    await expect(page.url()).toContain("/feed");
  });
});

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

test.describe("Home page", () => {
  test("Renders with correct h1 and key principles", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // The methodology CTA must be present
    await expect(page.getByRole("link", { name: /methodology/i })).toBeVisible();
  });

  test("Skip link is present for keyboard users", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText("Skip to main content")).toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// Methodology page
// ---------------------------------------------------------------------------

test.describe("Methodology page", () => {
  test("Renders editorial principles and status glossary", async ({ page }) => {
    await page.goto(`${BASE_URL}/methodology`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/presentation signals/i)).toBeVisible();
    await expect(page.getByText(/status glossary/i)).toBeVisible();
  });
});
