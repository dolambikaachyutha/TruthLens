/**
 * Browser tests for the dual-layer review system.
 * Requires: dev server on VQ_BASE_URL (default http://localhost:3000)
 * Run: node scripts/check-dual-layer-ui.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const base = process.env.VQ_BASE_URL ?? "http://localhost:3000";
const shots = path.join(os.tmpdir(), "vq-shots", "dual-layer");
fs.mkdirSync(shots, { recursive: true });

const problems = [];
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL, headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();

page.on("console", (m) => {
  if (m.type() !== "error") return;
  const text = m.text();
  // Intentional case-6 automation failure returns HTTP 500.
  if (text.includes("status of 500")) return;
  problems.push(`console.error: ${text}`);
});
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

function assert(condition, label) {
  if (condition) {
    console.log(`PASS  ${label}`);
  } else {
    problems.push(`ASSERT: ${label}`);
    console.log(`FAIL  ${label}`);
  }
}

async function shot(name) {
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
}

async function submitClaim({ text, sourceUrl, category = "Politics", platform = "WhatsApp" }) {
  await page.goto(`${base}/submit`, { waitUntil: "load" });
  await page.waitForTimeout(400);
  await page.fill("#claim-text", text);
  await page.locator("#claim-platform").click();
  await page.waitForTimeout(200);
  await page.getByRole("option", { name: platform, exact: true }).click();
  await page.locator("#claim-category").click();
  await page.waitForTimeout(200);
  await page.getByRole("option", { name: category, exact: true }).click();
  if (sourceUrl) {
    await page.fill("#claim-source", sourceUrl);
  } else {
    await page.fill("#claim-source", "");
  }
  await page.locator('button[type="submit"]').click();
  await page.waitForSelector('[data-testid="submit-success"]', { timeout: 10000 });
  await page.locator('[data-testid="view-claim"]').click();
  await page.waitForURL(/\/claims\//, { timeout: 10000 });
  await page.waitForTimeout(500);
}

async function waitForAutomationComplete(timeout = 25000) {
  await page
    .waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="automation-status"]');
        if (!el) return false;
        const t = el.textContent ?? "";
        return t.includes("Complete") || t.includes("Failed") || t.includes("Partial");
      },
      { timeout }
    )
    .catch(() => {});
}

async function getStoredClaim() {
  return page.evaluate(async () => {
    const response = await fetch("/api/claims", { cache: "no-store" });
    const list = await response.json();
    return list[0] ?? null;
  });
}

// ─── Case 1: no source URL ───────────────────────────────────────────
console.log("── Case 1: no source URL");
await page.goto(base, { waitUntil: "load" });
await page.evaluate(() => window.localStorage.removeItem("vq.session.id"));
await submitClaim({
  text: "City council secretly voted to raise taxes by 40 percent with no public notice.",
});
await waitForAutomationComplete();
await shot("case1-detail");
const body1 = await page.locator("body").innerText();
assert(body1.includes("Automated evidence desk"), "case1: automation panel shown");
assert(body1.includes("No source URL was provided"), "case1: no-source job message");
assert(body1.toLowerCase().includes("unverified"), "case1: claim remains Unverified");
let claim1 = await getStoredClaim();
assert(claim1?.claimStatus === "unverified", "case1: stored claimStatus unverified");
assert(
  claim1?.automationStatus === "completed",
  `case1: automationStatus completed (got ${claim1?.automationStatus})`
);
assert(
  claim1?.intakeStatus === "ready_for_review" ||
    claim1?.intakeStatus === "needs_more_context",
  `case1: intake ready after checks (got ${claim1?.intakeStatus})`
);
assert(
  claim1?.automatedEvidenceCount > 0,
  "case1: automatedEvidenceCount > 0"
);
assert(claim1?.publishedReview == null, "case1: no publishedReview yet");
assert(
  body1.includes(
    "Automated evidence gathering organizes references for review. It does not determine whether the claim is true or false."
  ),
  "case1: exact automation disclaimer"
);

// ─── Case 2: reachable source URL ────────────────────────────────────
console.log("── Case 2: reachable source URL");
await submitClaim({
  text: "A new public notice says the library will close for renovation next month according to the official facilities page.",
  sourceUrl: "https://example.com/",
});
await waitForAutomationComplete(40000);
await shot("case2-detail");
const body2 = await page.locator("body").innerText();
assert(
  body2.includes("Source is reachable") || body2.includes("reachable"),
  "case2: source reachability reported"
);
claim1 = await getStoredClaim();
assert(claim1?.claimStatus === "unverified", "case2: still Unverified after automation");
const reachJob = claim1?.evidence?.find(
  (e) => e.kind === "source_reachability"
);
assert(Boolean(reachJob), "case2: source_reachability evidence saved");
assert(
  reachJob?.status === "ok" || reachJob?.status === "warn" || reachJob?.status === "error",
  `case2: reachability status recorded (${reachJob?.status})`
);

// ─── Case 3: unreachable source URL ──────────────────────────────────
console.log("── Case 3: unreachable source URL");
await submitClaim({
  text: "Forwarded message claims an emergency bank holiday was declared overnight by unnamed officials.",
  sourceUrl: "https://vq-test-unreachable.invalid/claim",
});
await waitForAutomationComplete(40000);
await shot("case3-detail");
claim1 = await getStoredClaim();
const reach3 = claim1?.evidence?.find((e) => e.kind === "source_reachability");
assert(Boolean(reach3), "case3: reachability job present");
assert(
  reach3?.status === "error" || reach3?.status === "warn",
  `case3: unreachable marked error/warn (got ${reach3?.status})`
);
assert(claim1?.claimStatus === "unverified", "case3: remains Unverified");
assert(
  claim1?.automationStatus === "completed" ||
    claim1?.automationStatus === "partially_completed",
  `case3: automation finishes despite unreachable source (${claim1?.automationStatus})`
);
assert(
  claim1?.intakeStatus === "needs_more_context" ||
    claim1?.intakeStatus === "failed" ||
    claim1?.intakeStatus === "ready_for_review",
  `case3: intake status recorded (${claim1?.intakeStatus})`
);

// ─── Case 4: external fact-check matches (mocked API) ────────────────
console.log("── Case 4: external fact-check matches");
await page.unroute("**/api/evidence").catch(() => {});
await page.route("**/api/evidence", async (route) => {
  const request = route.request();
  request.postDataJSON();
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      factCheckConfigured: true,
      factCheckMatches: [
        {
          title: "Sample external fact-check reference",
          url: "https://example.com/fact-check-1",
          publisher: "Example Fact Index",
        },
      ],
      jobs: [
        {
          kind: "presentation_signals",
          title: "Presentation signals",
          status: "ok",
          summary: "1 signal: Urgency language. Risk tier: medium.",
        },
        {
          kind: "fact_check_search",
          title: "External fact-check references",
          status: "ok",
          summary:
            "1 external reference found. These are links only — not this platform's status.",
          detail: "Example Fact Index: Sample external fact-check reference",
          url: "https://example.com/fact-check-1",
        },
        {
          kind: "similar_claims",
          title: "Similar claims",
          status: "skipped",
          summary: "No similar claims found in the queue.",
        },
      ],
    }),
  });
});
await submitClaim({
  text: "URGENT: Free vaccine kits are being distributed this week only, share before deleted.",
  sourceUrl: "https://example.com/vaccine-kits",
});
await waitForAutomationComplete(15000);
await shot("case4-detail");
const body4 = await page.locator("body").innerText();
assert(
  body4.includes("External fact-check references") ||
    body4.includes("external reference"),
  "case4: external fact-check job shown"
);
claim1 = await getStoredClaim();
assert(claim1?.claimStatus === "unverified", "case4: status not copied from external rating");
assert(
  !body4.includes("truth percentage") && !/\b\d{1,3}%\s*(true|accurate)/i.test(body4),
  "case4: no truth percentage displayed"
);
await page.unroute("**/api/evidence").catch(() => {});

// ─── Case 5: no external matches (unconfigured) ──────────────────────
console.log("── Case 5: no external matches");
await submitClaim({
  text: "Neighborhood association says the weekend food drive is still on according to their flyer.",
  sourceUrl: "https://example.org/food-drive",
});
await waitForAutomationComplete(40000);
await shot("case5-detail");
const body5 = await page.locator("body").innerText();
claim1 = await getStoredClaim();
const fact5 = claim1?.evidence?.find((e) => e.kind === "fact_check_search");
assert(Boolean(fact5), "case5: fact-check job present");
assert(
  fact5?.status === "skipped" || fact5?.status === "ok" || fact5?.status === "error",
  `case5: fact-check status recorded (${fact5?.status})`
);
assert(
  body5.includes("not configured") ||
    body5.includes("no external references") ||
    body5.includes("No similar claims") ||
    fact5 != null,
  "case5: no-match / not-configured messaging or job record"
);
assert(claim1?.claimStatus === "unverified", "case5: remains Unverified");

// ─── Case 6: automation failure ──────────────────────────────────────
console.log("── Case 6: automation failure");
await page.route("**/api/evidence", async (route) => {
  await route.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({
      ok: false,
      error: "Forced automation failure for testing.",
      jobs: [],
      factCheckMatches: [],
      factCheckConfigured: false,
    }),
  });
});
await submitClaim({
  text: "BREAKING: Officials hid a secret vote overnight and deletes are coming, share now.",
});
await page
  .waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="automation-status"]');
      return el?.textContent?.includes("Failed");
    },
    { timeout: 15000 }
  )
  .catch(() => {});
await shot("case6-failure");
const body6 = await page.locator("body").innerText();
assert(
  body6.includes("Evidence gathering failed") ||
    body6.includes("Failed"),
  "case6: automation failure state shown"
);
claim1 = await getStoredClaim();
assert(claim1?.automationStatus === "failed", "case6: automationStatus failed");
assert(claim1?.claimStatus === "unverified", "case6: status remains Unverified after failure");
assert(claim1?.publishedReview == null, "case6: no human verdict from automation failure");
await page.unroute("**/api/evidence").catch(() => {});

// ─── Cases 7–10: human publishes verdicts ────────────────────────────
async function waitForAutomationIdle(timeout = 40000) {
  await page
    .waitForFunction(
      async () => {
        const response = await fetch("/api/claims", { cache: "no-store" });
        const list = await response.json();
        return list.every(
          (c) =>
            c.automationStatus !== "queued" &&
            c.automationStatus !== "running" &&
            c.automationStatus !== "not_started"
        );
      },
      { timeout }
    )
    .catch(() => {});
}

async function publishOnClaim(verdictTestId, expectedStatus, caseLabel) {
  await page.goto(`${base}/review`, { waitUntil: "load" });
  await page.waitForTimeout(700);
  await waitForAutomationIdle();

  const first = page.locator(
    'section[aria-label="Review queue"] button[aria-pressed]'
  );
  await first.first().click();
  await page.waitForTimeout(400);

  const selectedId = await page.evaluate(() => {
    const link = document.querySelector('a[href^="/claims/"]');
    return link?.getAttribute("href")?.replace("/claims/", "") ?? null;
  });
  assert(Boolean(selectedId), `${caseLabel}: selected a claim from the queue`);

  const startBtn = page.locator('[data-testid="start-review"]');
  if ((await startBtn.count()) > 0) {
    await startBtn.click();
    await page.waitForTimeout(400);
  }

  const noteText =
    "Reviewed primary sources and compared the circulating wording against the published record.";
  await page.fill('[data-testid="review-note"]', noteText);
  await page.fill(
    '[data-testid="evidence-url"]',
    "https://example.com/review-evidence"
  );
  await page.fill(
    '[data-testid="claim-interpretation"]',
    "The claim asserts a specific event happened on a stated date in a stated place."
  );
  await page.fill(
    '[data-testid="supporting-analysis"]',
    "Supporting sources include the official notice and one independent report."
  );
  await page.fill(
    '[data-testid="contradicting-analysis"]',
    "No strong contradicting sources were found beyond secondary commentary."
  );
  await page.fill(
    '[data-testid="context-analysis"]',
    "Checked the publication date, the location named in the claim, and the scope of who it affects."
  );
  await page.selectOption('[data-testid="evidence-strength"]', "moderate");
  await page.selectOption('[data-testid="review-confidence"]', "medium");
  await page.locator('[data-testid="checklist-date"]').check();
  await page.locator('[data-testid="checklist-location"]').check();
  await page.locator('[data-testid="checklist-scope"]').check();
  await page.waitForTimeout(300);

  const noteVal = await page.locator('[data-testid="review-note"]').inputValue();
  const urlVal = await page.locator('[data-testid="evidence-url"]').inputValue();
  assert(noteVal.length >= 20, `${caseLabel}: note field holds >= 20 chars`);
  assert(urlVal.startsWith("http"), `${caseLabel}: evidence URL field filled`);

  // Validation gate: publish with cleared fields must not stick.
  await page.fill('[data-testid="review-note"]', "");
  await page.fill('[data-testid="evidence-url"]', "");
  await page.fill('[data-testid="claim-interpretation"]', "");
  await page.locator('[data-testid="checklist-date"]').uncheck();
  await page.locator(`[data-testid="${verdictTestId}"]`).click();
  await page.waitForTimeout(250);
  const blocked = await page.evaluate(async (id) => {
    const response = await fetch("/api/claims", { cache: "no-store" });
    const list = await response.json();
    return list.find((c) => c.id === id);
  }, selectedId);
  assert(
    blocked?.publishedReview == null,
    `${caseLabel}: blocked publish without note+URL+analysis+checklist`
  );

  await page.fill('[data-testid="review-note"]', noteText);
  await page.fill(
    '[data-testid="evidence-url"]',
    "https://example.com/review-evidence"
  );
  await page.fill(
    '[data-testid="claim-interpretation"]',
    "The claim asserts a specific event happened on a stated date in a stated place."
  );
  await page.locator('[data-testid="checklist-date"]').check();
  await page.waitForTimeout(300);
  await page.locator(`[data-testid="${verdictTestId}"]`).click();
  await page.waitForFunction(
    async (id) => {
      const response = await fetch("/api/claims", { cache: "no-store" });
      const list = await response.json();
      const claim = list.find((c) => c.id === id);
      return Boolean(claim?.publishedReview);
    },
    selectedId,
    { timeout: 5000 }
  ).catch(() => {});
  await page.waitForTimeout(400);
  await shot(`${caseLabel}-published`);

  const stored = await page.evaluate(async () => {
    const response = await fetch("/api/claims", { cache: "no-store" });
    return response.json();
  });
  const published = stored.find((c) => c.id === selectedId);
  assert(Boolean(published), `${caseLabel}: selected claim still in store`);
  if (published) {
    assert(
      published.claimStatus === expectedStatus,
      `${caseLabel}: claimStatus is ${expectedStatus} (got ${published.claimStatus})`
    );
    assert(
      published.publishedReview?.verdict === expectedStatus,
      `${caseLabel}: publishedReview.verdict matches`
    );
    assert(
      published.publishedReview?.reviewerLabel === "Community reviewer",
      `${caseLabel}: reviewer label is Community reviewer`
    );
    assert(
      (published.publishedReview?.note ?? "").trim().length >= 20,
      `${caseLabel}: note length >= 20`
    );
    assert(
      (published.publishedReview?.evidenceUrls?.length ?? 0) >= 1,
      `${caseLabel}: at least one evidence URL`
    );
    assert(
      published.publishedReview?.qualityCheckPassed === true,
      `${caseLabel}: quality checklist passed`
    );
    assert(
      Boolean(published.publishedReview?.evidenceStrength),
      `${caseLabel}: evidence strength recorded`
    );
    assert(
      Boolean(published.publishedReview?.confidence),
      `${caseLabel}: review confidence recorded`
    );
    assert(
      published.reviewHistory.some((e) => e.action === "verdict_published"),
      `${caseLabel}: timeline has verdict_published event`
    );
  }

  // Give any in-flight automation a moment to attempt an overwrite, then re-check.
  await page.waitForTimeout(1200);
  const stored2 = await page.evaluate(async () => {
    const response = await fetch("/api/claims", { cache: "no-store" });
    return response.json();
  });
  const after = stored2.find((c) => c.id === selectedId);
  assert(
    after?.publishedReview?.verdict === expectedStatus,
    `${caseLabel}: publish survives automation race`
  );
  assert(
    after?.claimStatus === expectedStatus,
    `${caseLabel}: claimStatus survives automation race (got ${after?.claimStatus})`
  );
  return after;
}

// Prepare three fresh claims for three verdicts
await page.unroute("**/api/evidence").catch(() => {});
for (const text of [
  "Claim A: The mayor cancelled the entire transit budget yesterday in a closed session.",
  "Claim B: Drinking hot water with lemon cures influenza within twelve hours guaranteed.",
  "Claim C: A viral post says the new tax form is optional for everyone this year.",
]) {
  await submitClaim({ text, sourceUrl: "https://example.com/news" });
  await page.waitForTimeout(400);
}

console.log("── Case 7: publish Verified True");
await publishOnClaim("publish-verified_true", "verified_true", "case7");

console.log("── Case 8: publish Verified False");
await publishOnClaim("publish-verified_false", "verified_false", "case8");

console.log("── Case 9: publish Misleading");
await publishOnClaim("publish-misleading", "misleading", "case9");

// ─── Case 10: remains Unverified until explicit human review ─────────
console.log("── Case 10: Unverified until human publish");
await submitClaim({
  text: "Claim for lifecycle check: officials allegedly delayed the election certification without paperwork.",
});
await waitForAutomationComplete(40000);
const lifecycle = await getStoredClaim();
assert(
  lifecycle?.claimStatus === "unverified",
  "case10: after automation claimStatus is Unverified"
);
assert(
  lifecycle?.automationStatus === "completed",
  "case10: automation completed without setting verdict"
);
assert(
  lifecycle?.intakeStatus === "ready_for_review" ||
    lifecycle?.intakeStatus === "needs_more_context",
  `case10: intake ready for review (got ${lifecycle?.intakeStatus})`
);
assert(
  lifecycle?.publishedReview == null,
  "case10: publishedReview null until human publishes"
);
await shot("case10-unverified");

// Detail page human review awaiting message
const body10 = await page.locator("body").innerText();
assert(
  body10.includes(
    "Final verdicts are published only after a reviewer reads the evidence and records an explanation."
  ),
  "case10: exact human review message on detail"
);
assert(
  body10.toLowerCase().includes("awaiting verdict"),
  "case10: human review panel awaiting verdict"
);

console.log("SHOTS_DIR=" + shots);
console.log("PROBLEMS_START");
console.log(problems.length ? problems.join("\n") : "NO_PROBLEMS");
console.log("PROBLEMS_END");
await browser.close();
if (problems.length) process.exit(1);
