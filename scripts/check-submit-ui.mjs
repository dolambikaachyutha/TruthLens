import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const base = process.env.VQ_BASE_URL ?? "http://localhost:3000";
const shots = path.join(os.tmpdir(), "vq-shots");
fs.mkdirSync(shots, { recursive: true });

const problems = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console.error: ${m.text()}`);
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

await page.goto(`${base}/submit`, { waitUntil: "load" });
await page.waitForTimeout(600);

await page.locator('button[type="submit"]').click();
await page.waitForTimeout(400);
const body1 = await page.locator("body").innerText();
assert(body1.includes("Claim text is required."), "validation: claim text required error shown");
assert(
  body1.includes("Platform is required"),
  "validation: platform required error shown"
);
assert(
  body1.includes("Category is required"),
  "validation: category required error shown"
);
await page.screenshot({ path: path.join(shots, "a-validation-errors.png"), fullPage: false });

await page.fill(
  "#claim-text",
  "BREAKING SHOCKING NEWS SHARE BEFORE DELETED"
);
await page.waitForTimeout(500);
const liveBody = await page.locator("body").innerText();
assert(liveBody.includes("Presentation signals"), "live panel is rendered");
assert(liveBody.includes("Sensational language"), "live flag: Sensational language displayed");
assert(liveBody.includes("Shouting"), "live flag: Shouting displayed");
assert(liveBody.includes("Unsourced"), "live flag: Unsourced displayed");
assert(liveBody.toLowerCase().includes("high risk"), "live risk level: High risk displayed");
assert(
  liveBody.includes("not factual verdicts") || liveBody.includes("not truth judgments"),
  "disclaimer present: flags are not truth judgments"
);
await page.screenshot({ path: path.join(shots, "b-live-analysis.png"), fullPage: true });

await page.locator("#claim-platform").click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: "WhatsApp", exact: true }).click();
await page.waitForTimeout(300);

await page.locator("#claim-category").click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: "Politics", exact: true }).click();
await page.waitForTimeout(300);

const platformShown = await page.locator("#claim-platform").innerText();
const categoryShown = await page.locator("#claim-category").innerText();
assert(platformShown.includes("WhatsApp"), "platform select shows WhatsApp");
assert(categoryShown.includes("Politics"), "category select shows Politics");
await page.screenshot({ path: path.join(shots, "c-filled.png"), fullPage: true });

await page.locator('button[type="submit"]').click();
await page.waitForTimeout(1500);
const successBody = await page.locator("body").innerText();
assert(
  successBody.includes("Claim saved to the local queue"),
  "success state after submit"
);
assert(successBody.includes("Sensational language"), "success panel shows Sensational language");
assert(successBody.includes("Shouting"), "success panel shows Shouting");
assert(successBody.includes("Unsourced"), "success panel shows Unsourced");
assert(successBody.toLowerCase().includes("high risk"), "success panel shows High risk");
const stored = await page.evaluate(() =>
  window.localStorage.getItem("vq.submissions.v1")
);
assert(Boolean(stored && stored.includes("BREAKING SHOCKING")), "mock persistence stored the record");
await page.screenshot({ path: path.join(shots, "d-success.png"), fullPage: false });

console.log("SHOTS_DIR=" + shots);
console.log("PROBLEMS_START");
console.log(problems.length ? problems.join("\n") : "NO_PROBLEMS");
console.log("PROBLEMS_END");
await browser.close();
if (problems.length) process.exit(1);
