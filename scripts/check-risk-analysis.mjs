import { analyzeClaim, computeRiskLevel } from "../src/lib/risk-analysis.ts";

const cases = [
  {
    name: "Test case: BREAKING SHOCKING NEWS SHARE BEFORE DELETED",
    input: {
      claimText: "BREAKING SHOCKING NEWS SHARE BEFORE DELETED",
      sourceUrl: "",
    },
    expectFlags: ["sensational-language", "shouting", "unsourced"],
    expectLevel: "high",
  },
  {
    name: "Lowercase sensational also detected (case-insensitive)",
    input: {
      claimText: "breaking news: shocking secret exposed",
      sourceUrl: "https://example.com",
    },
    expectFlags: ["sensational-language"],
    expectLevel: "medium",
  },
  {
    name: "Clean sourced claim -> no flags",
    input: {
      claimText: "The city council meeting starts at 6 p.m. on Thursday.",
      sourceUrl: "https://www.usa.gov",
    },
    expectFlags: [],
    expectLevel: "low",
  },
  {
    name: "Exactly 50% uppercase -> NOT shouting",
    input: {
      claimText: "Ab",
      sourceUrl: "",
    },
    expectFlags: ["unsourced"],
    expectLevel: "medium",
  },
  {
    name: "Two flags -> High Risk (sensational + unsourced, no shouting)",
    input: {
      claimText: "urgent shocking update about the election",
      sourceUrl: "",
    },
    expectFlags: ["sensational-language", "unsourced"],
    expectLevel: "high",
  },
  {
    name: "Credential harvesting keywords -> high-severity flag",
    input: {
      claimText: "Send your OTP and CVV verification code to confirm login credentials.",
      sourceUrl: "https://example.com",
    },
    expectFlags: ["credential-harvesting"],
    expectLevel: "medium",
  },
  {
    name: "Financial manipulation keywords",
    input: {
      claimText: "Pay immediately via UPI for the processing fee or refund fee to transfer money.",
      sourceUrl: "https://example.com",
    },
    expectFlags: [
      "sensational-language",
      "financial-manipulation",
      "urgency-pressure",
    ],
    expectLevel: "high",
  },
  {
    name: "Urgency pressure keywords",
    input: {
      claimText: "Within 10 minutes — final warning: your account will be blocked. Threats apply.",
      sourceUrl: "https://example.com",
    },
    expectFlags: ["urgency-pressure"],
    expectLevel: "medium",
  },
  {
    name: "Legal action threat keywords",
    input: {
      claimText: "Failure to comply results in penalty, arrest, and service termination.",
      sourceUrl: "https://example.com",
    },
    expectFlags: ["legal-action-threat"],
    expectLevel: "medium",
  },
  {
    name: "Social engineering keywords",
    input: {
      claimText: "You've won! You've been selected. Your account has been compromised — confirm your identity.",
      sourceUrl: "https://example.com",
    },
    expectFlags: ["social-engineering"],
    expectLevel: "medium",
  },
  {
    name: "Phishing composite -> high risk with multiple categories",
    input: {
      claimText:
        "FINAL WARNING: Your account will be blocked. Confirm your identity and share OTP immediately or face arrest.",
      sourceUrl: "",
    },
    expectFlags: [
      "sensational-language",
      "unsourced",
      "credential-harvesting",
      "urgency-pressure",
      "legal-action-threat",
      "social-engineering",
    ],
    expectLevel: "high",
  },
];

let failed = 0;

for (const testCase of cases) {
  const result = analyzeClaim(testCase.input);
  const flagCodes = result.flags.map((flag) => flag.code);
  const flagsOk =
    flagCodes.length === testCase.expectFlags.length &&
    testCase.expectFlags.every((code) => flagCodes.includes(code));
  const levelOk = result.riskLevel === testCase.expectLevel;
  const levelFromCount = computeRiskLevel(result.flags) === result.riskLevel;

  if (flagsOk && levelOk && levelFromCount) {
    console.log(`PASS  ${testCase.name}`);
    console.log(`      flags=[${flagCodes.join(", ")}] level=${result.riskLevel}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${testCase.name}`);
    console.log(
      `      expected flags=[${testCase.expectFlags.join(", ")}] level=${testCase.expectLevel}`
    );
    console.log(`      actual   flags=[${flagCodes.join(", ")}] level=${result.riskLevel}`);
  }
}

const truthWords = /is (true|false)|proven (true|false)|definitely (true|false)/i;
const sample = analyzeClaim({
  claimText: "BREAKING SHOCKING NEWS SHARE BEFORE DELETED",
  sourceUrl: "",
});
const languageOk = sample.flags.every(
  (flag) => !truthWords.test(flag.label) && !truthWords.test(flag.rationale)
);
console.log(
  languageOk
    ? "PASS  flag language contains no truth judgments"
    : "FAIL  flag language contains truth judgments"
);
if (!languageOk) failed += 1;

const keywordSamples = [
  "Share your OTP and password now",
  "Transfer money for processing fee via UPI",
  "Within 10 minutes your account will be blocked",
  "You will face penalty and arrest",
  "You've been selected — confirm your identity",
];
const keywordLanguageOk = keywordSamples.every((text) =>
  analyzeClaim({ claimText: text, sourceUrl: "https://example.com" }).flags.every(
    (flag) => !truthWords.test(flag.label) && !truthWords.test(flag.rationale)
  )
);
console.log(
  keywordLanguageOk
    ? "PASS  keyword-category rationales contain no truth judgments"
    : "FAIL  keyword-category rationales contain truth judgments"
);
if (!keywordLanguageOk) failed += 1;

const categoryCodes = [
  "credential-harvesting",
  "financial-manipulation",
  "urgency-pressure",
  "legal-action-threat",
  "social-engineering",
];
const allCodesOk = categoryCodes.every((code) =>
  sample.flags.length >= 0 &&
  analyzeClaim({
    claimText:
      "OTP password CVV pay immediately transfer money processing fee UPI refund fee within 10 minutes act now final warning threats account will be blocked penalty arrest service termination you've won you've been selected your account has been compromised confirm your identity",
    sourceUrl: "https://example.com",
  }).flags.some((flag) => flag.code === code)
);
console.log(
  allCodesOk
    ? "PASS  all five keyword categories fire on combined sample"
  : "FAIL  missing keyword category flags"
);
if (!allCodesOk) failed += 1;

if (failed > 0) {
  console.log(`\n${failed} case(s) FAILED`);
  process.exit(1);
}
console.log("\nAll risk-analysis checks passed.");
