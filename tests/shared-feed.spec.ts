import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function writeClaim(page: Page, claim: Record<string, unknown>) {
  const response = await page.evaluate(async (payload) => {
    const result = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { status: result.status, body: await result.json() };
  }, claim);
  expect(response.status).toBe(200);
}

test("Browser A and Browser B share submissions, reviews, support, and deletes", async ({
  browser,
}) => {
  const browserA = await browser.newContext();
  const browserB = await browser.newContext();
  const pageA = await browserA.newPage();
  const pageB = await browserB.newPage();
  const claimId = `e2e-shared-${Date.now()}`;
  const now = new Date().toISOString();
  const claim = {
    id: claimId,
    title: "Cross-browser shared TruthLens claim",
    body: "Cross-browser shared TruthLens claim for the public feed test.",
    category: "other",
    platform: "Other",
    sourceUrl: null,
    claimStatus: "unverified",
    intakeStatus: "ready_for_review",
    automationStatus: "completed",
    automatedEvidenceCount: 0,
    riskLevel: "low",
    riskFlags: [],
    evidence: [],
    intakeChecks: [],
    corrections: [],
    versions: [],
    isVisibleInUnderReview: true,
    isVisibleInReviewedFeed: true,
    sameClaimCount: 0,
    sameClaimVoterIds: [],
    isDeleted: false,
    publishedReview: null,
    humanReview: null,
    communityReviews: [],
    reviewHistory: [],
    submittedAt: now,
    updatedAt: now,
    versionNumber: 1,
  };

  try {
    await pageA.goto(`${BASE_URL}/feed`);
    await pageB.goto(`${BASE_URL}/feed`);
    await writeClaim(pageA, claim);

    await pageB.reload();
    await expect(pageB.getByText(claim.title, { exact: true })).toBeVisible();

    const reviewedClaim = {
      ...claim,
      claimStatus: "verified_true",
      sameClaimCount: 1,
      updatedAt: new Date().toISOString(),
      publishedReview: {
        verdict: "verified_true",
        reviewerLabel: "Shared-feed test reviewer",
        note: "The shared browser verification review includes enough detail.",
        evidenceUrls: ["https://example.com/shared-feed-evidence"],
        publishedAt: new Date().toISOString(),
        claimInterpretation: "The claim describes a testable public statement.",
        supportingAnalysis: "The source supports the statement for this test.",
        contradictingAnalysis: "No contradicting evidence was recorded.",
        contextAnalysis: "The date, location, and scope were checked.",
        evidenceStrength: "moderate",
        confidence: "medium",
        qualityChecklist: {
          dateChecked: true,
          locationChecked: true,
          scopeChecked: true,
        },
        qualityCheckPassed: true,
      },
    };

    await writeClaim(pageA, reviewedClaim);
    await pageB.reload();
    await expect(pageB.getByText(claim.title, { exact: true })).toBeVisible();
    await expect(pageB.getByText(/Evidence Supports/i).first()).toBeVisible();
    await expect(pageB.getByText(/1 same claim/i).first()).toBeVisible();

    await writeClaim(pageA, {
      ...reviewedClaim,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      isVisibleInUnderReview: false,
      isVisibleInReviewedFeed: false,
    });
    await pageB.reload();
    await expect(pageB.getByText(claim.title, { exact: true })).not.toBeVisible();
  } finally {
    await browserA.close();
    await browserB.close();
  }
});

async function waitForReviewCount(
  page: Page,
  claimId: string,
  min: number,
  timeoutMs = 15000
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const count = await page.evaluate(async (id) => {
      const response = await fetch("/api/claims", { cache: "no-store" });
      const list = (await response.json()) as {
        id: string;
        communityReviews?: unknown[];
      }[];
      const found = list.find((claim) => claim.id === id);
      return found?.communityReviews?.length ?? 0;
    }, claimId);
    if (count >= min) return count;
    await page.waitForTimeout(500);
  }
  return -1;
}

test("Community reviews are shared across browsers and append-only", async ({
  browser,
}) => {
  const browserA = await browser.newContext();
  const browserB = await browser.newContext();
  const pageA = await browserA.newPage();
  const pageB = await browserB.newPage();
  const claimId = `e2e-reviews-${Date.now()}`;
  const now = new Date().toISOString();
  const noteOne =
    "First independent review: checked the official notice and found the date matches the claim.";
  const noteTwo =
    "Second independent review: cross-checked a separate archive copy and the wording is consistent.";

  try {
    await pageA.goto(`${BASE_URL}/feed`);
    await pageB.goto(`${BASE_URL}/feed`);

    // Create the claim through the shared API.
    const created = await pageA.evaluate(async (payload) => {
      const result = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return result.status;
    }, {
      id: claimId,
      title: "Cross-browser shared review claim",
      body: "Cross-browser shared review claim for the append-only review test.",
      category: "other",
      platform: "Other",
      sourceUrl: null,
      claimStatus: "unverified",
      intakeStatus: "ready_for_review",
      automationStatus: "completed",
      automatedEvidenceCount: 0,
      riskLevel: "low",
      riskFlags: [],
      evidence: [],
      intakeChecks: [],
      corrections: [],
      versions: [],
      isVisibleInUnderReview: true,
      isVisibleInReviewedFeed: true,
      sameClaimCount: 0,
      sameClaimVoterIds: [],
      isDeleted: false,
      publishedReview: null,
      humanReview: null,
      communityReviews: [],
      reviewHistory: [],
      submittedAt: now,
      updatedAt: now,
      versionNumber: 1,
    });
    expect(created).toBe(200);

    // Browser A adds the first review through the detail page.
    await pageA.goto(`${BASE_URL}/claims/${claimId}`);
    await pageA.getByTestId("detail-add-review").click();
    await pageA.getByTestId("community-review-note").fill(noteOne);
    await pageA.getByTestId("community-review-submit").click();
    await expect(pageA.getByTestId("community-reviews-count")).toHaveText(
      "Reviews (1)"
    );
    await expect(pageA.getByTestId("community-review-number-1")).toBeVisible();
    await expect(pageA.getByTestId("community-review-author-1")).toHaveText(
      "Reviewed by Community reviewer"
    );
    await expect(pageA.getByText(noteOne)).toBeVisible();
    expect(await waitForReviewCount(pageA, claimId, 1)).toBeGreaterThanOrEqual(1);

    // Browser B (separate session) sees the same review in the feed and detail.
    await pageB.reload();
    await expect(
      pageB.getByTestId(`community-review-count-${claimId}`)
    ).toHaveText("Reviews (1)");
    await pageB.goto(`${BASE_URL}/claims/${claimId}`);
    await expect(pageB.getByText(noteOne)).toBeVisible();
    await expect(pageB.getByTestId("detail-add-review")).toHaveText(
      "Add another review"
    );

    // Browser B appends a second review — the first must be preserved.
    await pageB.getByTestId("detail-add-review").click();
    await pageB.getByTestId("community-review-note").fill(noteTwo);
    await pageB.getByTestId("community-review-submit").click();
    await expect(pageB.getByTestId("community-reviews-count")).toHaveText(
      "Reviews (2)"
    );
    await expect(pageB.getByText(noteOne)).toBeVisible();
    await expect(pageB.getByText(noteTwo)).toBeVisible();
    await expect(pageB.getByTestId("community-review-number-1")).toBeVisible();
    await expect(pageB.getByTestId("community-review-number-2")).toBeVisible();
    expect(await waitForReviewCount(pageA, claimId, 2)).toBeGreaterThanOrEqual(2);

    // Browser A reloads and still sees both reviews in order.
    await pageA.reload();
    await expect(pageA.getByTestId("community-reviews-count")).toHaveText(
      "Reviews (2)"
    );
    await expect(pageA.getByText(noteOne)).toBeVisible();
    await expect(pageA.getByText(noteTwo)).toBeVisible();
    const authorOne = await pageA
      .getByTestId("community-review-author-1")
      .textContent();
    expect(authorOne).toContain("Reviewed by");
  } finally {
    await browserA.close();
    await browserB.close();
  }
});
