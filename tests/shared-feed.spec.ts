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
