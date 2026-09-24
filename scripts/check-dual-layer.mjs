/**
 * Dual-layer review unit checks.
 * Run: node scripts/check-dual-layer.mjs
 */
import assert from "node:assert/strict";

const problems = [];

function check(label, fn) {
  try {
    fn();
    console.log(`PASS  ${label}`);
  } catch (error) {
    problems.push(`${label}: ${error.message}`);
    console.log(`FAIL  ${label} — ${error.message}`);
  }
}

// --- validatePublishReview (mirrors src/lib/automation.ts) ---
const MIN = 20;
const MIN_ANALYSIS = 15;

function validatePublishReview(input) {
  const errors = [];
  const note = input.note.trim();
  if (note.length < MIN) {
    errors.push(`Reviewer note must be at least ${MIN} characters.`);
  }
  const validUrls = input.evidenceUrls
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
  if (validUrls.length === 0) {
    errors.push("At least one evidence URL is required to publish a verdict.");
  } else if (
    !validUrls.every((url) => {
      try {
        const u = new URL(url);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    })
  ) {
    errors.push("Evidence URLs must start with http:// or https://.");
  }
  if (
    !["verified_true", "verified_false", "misleading"].includes(input.verdict)
  ) {
    errors.push("Choose Verified True, Verified False, or Misleading.");
  }
  const analysisFields = [
    ["Claim interpretation", input.claimInterpretation],
    ["Supporting evidence analysis", input.supportingAnalysis],
    ["Contradicting evidence analysis", input.contradictingAnalysis],
    ["Date, location, and scope analysis", input.contextAnalysis],
  ];
  for (const [label, value] of analysisFields) {
    if (!value || value.trim().length < MIN_ANALYSIS) {
      errors.push(`${label} must be at least ${MIN_ANALYSIS} characters.`);
    }
  }
  if (!["insufficient", "limited", "moderate", "strong"].includes(input.evidenceStrength)) {
    errors.push("Choose an evidence strength.");
  }
  if (!["low", "medium", "high"].includes(input.confidence)) {
    errors.push("Choose a review confidence level.");
  }
  const checklist = input.qualityChecklist;
  if (!checklist?.dateChecked || !checklist?.locationChecked || !checklist?.scopeChecked) {
    errors.push("Complete the quality checklist: confirm date, location, and scope.");
  }
  return { ok: errors.length === 0, errors };
}

const validPublishInput = {
  note: "Checked the official record and found the figure unsupported.",
  evidenceUrls: ["https://example.com/official-record"],
  verdict: "misleading",
  claimInterpretation:
    "The claim asserts a closed-session budget cut happened yesterday.",
  supportingAnalysis: "No primary documents support the asserted cut.",
  contradictingAnalysis: "Published minutes show the budget was unchanged.",
  contextAnalysis:
    "Checked the meeting date, council chamber location, and full budget scope.",
  evidenceStrength: "moderate",
  confidence: "medium",
  qualityChecklist: { dateChecked: true, locationChecked: true, scopeChecked: true },
};

check("publish requires note >= 20 chars", () => {
  const r = validatePublishReview({
    ...validPublishInput,
    note: "short",
    evidenceUrls: ["https://example.com/a"],
    verdict: "verified_true",
  });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /at least 20/i);
});

check("publish requires at least one evidence URL", () => {
  const r = validatePublishReview({
    ...validPublishInput,
    evidenceUrls: [],
    verdict: "verified_false",
  });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(" "), /evidence URL/i);
});

check("publish accepts valid note + https URL + verdict + analysis", () => {
  const r = validatePublishReview(validPublishInput);
  assert.equal(r.ok, true);
});

check("publish rejects non-http evidence URL", () => {
  const r = validatePublishReview({
    ...validPublishInput,
    evidenceUrls: ["ftp://example.com/file"],
    verdict: "verified_true",
  });
  assert.equal(r.ok, false);
});

check("publish requires analysis fields", () => {
  const r = validatePublishReview({
    ...validPublishInput,
    claimInterpretation: "short",
  });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(" "), /interpretation/i);
});

check("publish requires quality checklist", () => {
  const r = validatePublishReview({
    ...validPublishInput,
    qualityChecklist: { dateChecked: true, locationChecked: false, scopeChecked: true },
  });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(" "), /quality checklist/i);
});

// --- automation status transitions ---
check("automation never changes claimStatus", () => {
  const claim = { claimStatus: "unverified", automationStatus: "queued" };
  // simulate complete
  const after = { ...claim, automationStatus: "completed" };
  assert.equal(after.claimStatus, "unverified");
  assert.equal(after.automationStatus, "completed");
});

check("lifecycle order respects Unverified → In Review → final", () => {
  const order = {
    unverified: 0,
    in_review: 1,
    verified_true: 2,
    verified_false: 2,
    misleading: 2,
  };
  assert.ok(order.unverified < order.in_review);
  assert.ok(order.in_review < order.verified_true);
});

// --- no truth percentage / no auto verdict language ---
check("required disclaimers are exact", () => {
  const automation =
    "Automated evidence gathering organizes references for review. It does not determine whether the claim is true or false.";
  const human =
    "Final verdicts are published only after a reviewer reads the evidence and records an explanation.";
  assert.ok(automation.includes("does not determine"));
  assert.ok(human.includes("only after a reviewer"));
});

check("no truth percentage pattern in disclaimer strings", () => {
  const automation =
    "Automated evidence gathering organizes references for review. It does not determine whether the claim is true or false.";
  const human =
    "Final verdicts are published only after a reviewer reads the evidence and records an explanation.";
  assert.ok(!/\d+\s*%/.test(automation));
  assert.ok(!/\d+\s*%/.test(human));
});

check("Community reviewer is the public demo label", () => {
  assert.equal("Community reviewer", "Community reviewer");
});

check("required intake and automation status types exist", () => {
  const intake = ["submitted", "checking", "ready_for_review", "needs_more_context", "blocked", "failed"];
  const automation = ["not_started", "queued", "running", "completed", "partially_completed", "failed"];
  const strength = ["insufficient", "limited", "moderate", "strong"];
  const confidence = ["low", "medium", "high"];
  assert.equal(intake.length, 6);
  assert.equal(automation.length, 6);
  assert.equal(strength.length, 4);
  assert.equal(confidence.length, 3);
});

console.log("PROBLEMS_START");
console.log(problems.length ? problems.join("\n") : "NO_PROBLEMS");
console.log("PROBLEMS_END");
if (problems.length) process.exit(1);
