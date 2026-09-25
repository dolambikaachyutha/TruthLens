import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Shared-feed contract check.
 * Browser A submits a claim through the UI. Browser B (a completely separate
 * browser context with its own empty localStorage) must see the same claim on
 * /feed within a few seconds — proving every visitor shares one server store.
 */
const base = process.env.VQ_BASE_URL ?? "http://localhost:3000";
const problems = [];
const shots = path.join(os.tmpdir(), "vq-shared-feed");
fs.mkdirSync(shots, { recursive: true });

function assert(condition, label) {
  if (condition) {
    console.log(`PASS  ${label}`);
  } else {
    problems.push(`ASSERT: ${label}`);
    console.log(`FAIL  ${label}`);
  }
}

const text = `Shared feed check ${Date.now()}`;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL, headless: true });

// ── Browser A: submit a claim ──────────────────────────────────────────────
const ctxA = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const pageA = await ctxA.newPage();
pageA.on("pageerror", (e) => problems.push(`A pageerror: ${e.message}`));
pageA.on("console", (m) => {
  if (m.type() === "error") console.log(`A console.error: ${m.text().slice(0, 200)}`);
});

await pageA.goto(`${base}/submit`, { waitUntil: "load" });
await pageA.fill("#claim-text", text);
await pageA.locator("#claim-platform").click();
await pageA.getByRole("option", { name: "WhatsApp", exact: true }).click();
await pageA.locator("#claim-category").click();
await pageA.getByRole("option", { name: "Other", exact: true }).click();
await pageA.locator('button[type="submit"]').click();
// If the similar-claim panel appears, post as a new claim anyway.
try {
  const continueBtn = pageA.getByTestId("continue-new-claim");
  await continueBtn.waitFor({ state: "visible", timeout: 4000 });
  await continueBtn.click();
} catch {
  // No similar matches — the success panel renders directly.
}
// Allow up to 6s for the success panel (submission + server sync + re-render).
let savedA = false;
for (let i = 0; i < 8; i += 1) {
  const body = await pageA.locator("body").innerText();
  if (body.includes("Claim submitted to the shared feed")) {
    savedA = true;
    break;
  }
  await pageA.waitForTimeout(750);
}
assert(savedA, "A: claim submitted");
if (!savedA) {
  const dump = await pageA.locator("body").innerText();
  console.log("A BODY SNAPSHOT >>>\n" + dump.slice(0, 900));
}
await pageA.screenshot({ path: path.join(shots, "a-submitted.png") });

// ── Browser B: fresh storage, must see A's claim ───────────────────────────
const ctxB = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const pageB = await ctxB.newPage();
pageB.on("pageerror", (e) => problems.push(`B pageerror: ${e.message}`));

await pageB.goto(`${base}/feed`, { waitUntil: "load" });

// The client polls the shared store every 5s; allow up to 15s for convergence.
let seen = false;
for (let i = 0; i < 6; i += 1) {
  const body = await pageB.locator("body").innerText();
  if (body.includes(text)) {
    seen = true;
    break;
  }
  await pageB.waitForTimeout(2500);
}
assert(seen, "B: sees the claim submitted by A (shared store works)");

// The "Add review" action must be visible without hovering (all browsers).
const addReviewBtn = pageB
  .locator('button[aria-label^="Add independent review for"]')
  .first();
if ((await addReviewBtn.count()) > 0) {
  assert(
    await addReviewBtn.isVisible(),
    "B: review option is visible on the claim card"
  );
} else {
  assert(false, "B: review option is visible on the claim card");
}

// B opens the claim detail directly and must find it there too.
if (seen) {
  const link = pageB.locator("a", { hasText: text }).first();
  if (await link.count()) {
    await link.click();
    await pageB.waitForTimeout(1200);
    const detail = await pageB.locator("body").innerText();
    assert(detail.includes(text), "B: claim detail page renders A's claim");
  }
}
await pageB.screenshot({ path: path.join(shots, "b-feed.png") });

console.log("SHOTS_DIR=" + shots);
console.log("PROBLEMS_START");
console.log(problems.length ? problems.join("\n") : "NO_PROBLEMS");
console.log("PROBLEMS_END");
await browser.close();
if (problems.length) process.exit(1);
