import type { RiskFlag, RiskLevel } from "@/lib/types";

export interface RiskAnalysisInput {
  claimText: string;
  sourceUrl?: string | null;
}

export interface RiskAnalysis {
  flags: RiskFlag[];
  riskLevel: RiskLevel;
  uppercaseRatio: number;
}

// ---------------------------------------------------------------------------
// Sensational-language detection
// ---------------------------------------------------------------------------

/**
 * Patterns that match viral/alarmist framing style.
 * Case-insensitive. Each pattern is distinct to avoid double-counting the
 * same phrase through multiple overlapping entries.
 *
 * These are STYLE signals — never truth judgments.
 */
const SENSATIONAL_PATTERNS: RegExp[] = [
  /\bbreaking\b/i,
  /\bshocking\b/i,
  /\bshock\s+wave\b/i,
  /\burgent\b/i,
  /\bimmediate(?:ly)?\b/i,
  /\bbefore\s+(?:it'?s?\s+)?deleted\b/i,
  /\bshare\s+(?:this\s+)?(?:before|now|quickly|fast)\b/i,
  /\byou\s+won'?t\s+believe\b/i,
  /\bunbelievable\b/i,
  /\bsecret(?:ly)?\b/i,
  /\bexposed\b/i,
  /\bmiracle\b/i,
  /\bact\s+now\b/i,
  /\bmust\s+(?:see|share)\b/i,
  /\bviral(?:\s+truth)?\b/i,
  /\bexclusive\b/i,
  /\bthey\s+don'?t\s+want\s+you\s+to\s+know\b/i,
];

/** Returns true if any sensational pattern matches the claim text. */
export function containsSensationalLanguage(claimText: string): boolean {
  const text = claimText.trim();
  if (!text) return false;
  return SENSATIONAL_PATTERNS.some((pattern) => pattern.test(text));
}

// ---------------------------------------------------------------------------
// Keyword-category detection (credential harvesting, financial pressure, etc.)
// ---------------------------------------------------------------------------

/**
 * Keyword categories for methodology analysis.
 * These are deterministic pattern signals for human triage — never truth judgments.
 */
export const KEYWORD_CATEGORIES: ReadonlyArray<{
  readonly code: string;
  readonly label: string;
  readonly severity: RiskFlag["severity"];
  readonly keywords: readonly string[];
  readonly patterns: readonly RegExp[];
  readonly rationale: string;
}> = [
  {
    code: "credential-harvesting",
    label: "Credential harvesting pattern",
    severity: "high",
    keywords: ["OTP", "PIN", "password", "CVV", "verification code", "login credentials"],
    patterns: [
      /\botp\b/i,
      /\bpin\b/i,
      /\bpasswords?\b/i,
      /\bcvv\b/i,
      /verification\s+code/i,
      /login\s+credentials?/i,
      /share\s+(?:your\s+)?(?:otp|pin|password|cvv)/i,
      /enter\s+(?:your\s+)?(?:otp|pin|password|cvv)/i,
    ],
    rationale:
      "Text requests or references one-time codes, PINs, passwords, CVVs, or login credentials — a credential-harvesting pattern for reviewers to inspect, not a factual verdict.",
  },
  {
    code: "financial-manipulation",
    label: "Financial manipulation pattern",
    severity: "high",
    keywords: ["Pay immediately", "Transfer money", "Processing fee", "UPI", "Refund fee"],
    patterns: [
      /pay\s+immediately/i,
      /transfer\s+money/i,
      /processing\s+fee/i,
      /\bupi\b/i,
      /refund\s+fee/i,
      /send\s+money\s+immediately/i,
      /pay\s+(?:a\s+)?(?:fee|amount)\s+now/i,
    ],
    rationale:
      "Text pressures the reader to pay, transfer funds, or pay a processing/refund fee — a financial-pressure pattern for human review, not a truth claim.",
  },
  {
    code: "urgency-pressure",
    label: "Urgency pressure",
    severity: "medium",
    keywords: ["Immediately", "Within 10 minutes", "Act now", "Final warning", "Account will be blocked"],
    patterns: [
      /\bimmediately\b/i,
      /within\s+(?:10|ten)\s+minutes/i,
      /\bact\s+now\b/i,
      /final\s+warning/i,
      /account\s+will\s+be\s+blocked/i,
      /will\s+be\s+blocked/i,
      /blocked\s+(?:within|in)\s+\d+\s*(?:min|minutes)/i,
    ],
    rationale:
      "Deadline or threat wording (immediately, within 10 minutes, act now, final warning, account will be blocked) pressures fast action — an urgency signal, not a judgment of truth.",
  },
  {
    code: "legal-action-threat",
    label: "Legal action threat",
    severity: "high",
    keywords: ["Penalty", "Arrest", "Service termination"],
    patterns: [
      /\bpenalty\b/i,
      /\barrest(?:ed|s)?\b/i,
      /service\s+termination/i,
      /legal\s+action\s+will\s+be\s+taken/i,
      /face\s+(?:an?\s+)?arrest/i,
      /terminate\s+(?:your\s+)?service/i,
    ],
    rationale:
      "Wording invokes penalty, arrest, or service termination to coerce compliance — a legal-pressure pattern for reviewers, never an automated truth label.",
  },
  {
    code: "social-engineering",
    label: "Social engineering pattern",
    severity: "high",
    keywords: ["You've won", "You've been selected", "Your account has been compromised", "Confirm your identity"],
    patterns: [
      /you(?:'|')ve\s+won/i,
      /you\s+have\s+won/i,
      /you(?:'|')ve\s+been\s+selected/i,
      /you\s+have\s+been\s+selected/i,
      /your\s+account\s+has\s+been\s+compromised/i,
      /account\s+(?:has\s+been|is)\s+compromised/i,
      /confirm\s+your\s+identity/i,
      /verify\s+your\s+identity\s+immediately/i,
    ],
    rationale:
      "Win/selection notices, compromised-account claims, or identity-confirm prompts are classic social-engineering patterns — flags for human inspection only.",
  },
] as const;

/** Returns matching keyword-category flags for the claim text. De-duplicates by code. */
export function matchKeywordCategories(claimText: string): RiskFlag[] {
  const text = claimText.trim();
  if (!text) return [];

  const flags: RiskFlag[] = [];
  for (const entry of KEYWORD_CATEGORIES) {
    if (entry.patterns.some((pattern) => pattern.test(text))) {
      flags.push({
        code: entry.code,
        label: entry.label,
        severity: entry.severity,
        rationale: entry.rationale,
      });
    }
  }
  return flags;
}

/** Returns keyword strings that matched in the claim text (used by the UI). */
export function matchedKeywords(claimText: string): string[] {
  const text = claimText.trim();
  if (!text) return [];
  const found: string[] = [];
  for (const entry of KEYWORD_CATEGORIES) {
    for (const keyword of entry.keywords) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
      if (pattern.test(text)) found.push(keyword);
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Shouting detection (>50 % of alphabetic characters are uppercase)
// ---------------------------------------------------------------------------

/**
 * Returns the ratio of uppercase letters to total alphabetic characters.
 * Returns 0 for empty / non-alphabetic strings.
 */
export function uppercaseRatio(claimText: string): number {
  const letters = claimText.match(/[a-zA-Z]/g);
  if (!letters || letters.length === 0) return 0;
  const upper = letters.filter((ch) => ch >= "A" && ch <= "Z").length;
  return upper / letters.length;
}

/**
 * Returns true when more than 50 % of alphabetic characters are uppercase.
 * Compliant with AGENTS.md: "Detect Shouting when more than 50% of alphabetic
 * characters are uppercase."
 */
export function isShouting(claimText: string): boolean {
  if (!claimText.trim()) return false;
  return uppercaseRatio(claimText) > 0.5;
}

// ---------------------------------------------------------------------------
// Unsourced detection
// ---------------------------------------------------------------------------

/** Returns true when no source URL was supplied. */
export function isUnsourced(sourceUrl?: string | null): boolean {
  return !sourceUrl || sourceUrl.trim() === "";
}

// ---------------------------------------------------------------------------
// Individual flag builders
// ---------------------------------------------------------------------------

function sensationalFlag(): RiskFlag {
  return {
    code: "sensational-language",
    label: "Sensational language",
    severity: "medium",
    rationale:
      'Viral-style wording such as "breaking" or "shocking" — a style signal for reviewers, not a judgment of truth.',
  };
}

function shoutingFlag(ratio: number): RiskFlag {
  const percent = Math.round(ratio * 100);
  return {
    code: "shouting",
    label: "Shouting",
    severity: "medium",
    rationale: `${percent}% of alphabetic characters are uppercase — a formatting signal only, not a judgment of truth.`,
  };
}

function unsourcedFlag(): RiskFlag {
  return {
    code: "unsourced",
    label: "Unsourced",
    severity: "high",
    rationale:
      "No source URL was provided for reviewers to open — a sourcing signal, not a judgment of truth.",
  };
}

// ---------------------------------------------------------------------------
// Risk-level computation
// ---------------------------------------------------------------------------

/**
 * Two or more flags → High Risk.
 * Exactly one flag → Medium Risk.
 * Zero flags → Low Risk.
 *
 * Per AGENTS.md: "Two or more flags produce High Risk."
 */
export function computeRiskLevel(flags: RiskFlag[]): RiskLevel {
  if (flags.length >= 2) return "high";
  if (flags.length === 1) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Analyses a claim and returns de-duplicated risk flags and a risk level.
 *
 * Flag ordering:
 * 1. Sensational language (style)
 * 2. Shouting (formatting)
 * 3. Unsourced (sourcing)
 * 4. Keyword categories (content)
 *
 * Flags are de-duplicated by code so no code appears twice even if multiple
 * patterns for the same category fire simultaneously.
 */
export function analyzeClaim(input: RiskAnalysisInput): RiskAnalysis {
  const claimText = input.claimText ?? "";
  const ratio = uppercaseRatio(claimText);
  const seen = new Set<string>();
  const flags: RiskFlag[] = [];

  function addFlag(flag: RiskFlag): void {
    if (!seen.has(flag.code)) {
      seen.add(flag.code);
      flags.push(flag);
    }
  }

  if (containsSensationalLanguage(claimText)) addFlag(sensationalFlag());
  if (isShouting(claimText)) addFlag(shoutingFlag(ratio));
  if (isUnsourced(input.sourceUrl)) addFlag(unsourcedFlag());
  for (const flag of matchKeywordCategories(claimText)) addFlag(flag);

  return {
    flags,
    riskLevel: computeRiskLevel(flags),
    uppercaseRatio: ratio,
  };
}
