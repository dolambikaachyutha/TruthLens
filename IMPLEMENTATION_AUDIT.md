# TruthLens — Implementation Audit

## Existing features (preserve)

- No-auth public pages: `/`, `/submit`, `/feed`, `/claims/[id]`, `/review`, `/methodology`
- Claim submission form (Zod + React Hook Form) with live presentation-signal analysis
- Risk flags: sensational language, shouting (>50% uppercase), unsourced; risk levels low/medium/high
- Local claim store (`src/lib/claim-store.ts`, localStorage `vq.claims.v1`) with `useSyncExternalStore` hooks
- Automated evidence desk: `POST /api/evidence` — presentation signals, source reachability, source metadata, Wayback archive, optional fact-check search, similar claims
- Automation never mutates `claimStatus` (verified by unit + browser tests)
- Human review workspace `/review`: start review → note (≥20 chars) + ≥1 http(s) evidence URL → publish Verified True / Verified False / Misleading
- Reviewer label: `Community reviewer`
- Claim detail: original text, automation panel, human review panel, signals, timeline, copy link
- Feed: search + category + status filters (partial vs required filter set)
- Exact disclaimers in `src/lib/automation.ts`
- Tests: `scripts/check-dual-layer.mjs`, `check-dual-layer-ui.mjs`, `check-risk-analysis.mjs`, `check-submit-ui.mjs`
- No authentication, login, signup, or password flows (confirmed)
- README.md with `[HACKATHON_ID_PLACEHOLDER]`, DECISIONS.md with DP1–DP3

## Missing features (implement)

1. **IntakeStatus** and intake lifecycle on claims (`submitted` → `checking` → `ready_for_review` / `needs_more_context` / `blocked` / `failed`)
2. **AutomationStatus** required values: `not_started`, `queued`, `running`, `completed`, `partially_completed`, `failed` (current: `pending`/`processing`/`complete`/`failed`)
3. **EvidenceStrength** + **ReviewConfidence** on published reviews
4. Intake checks not yet present as explicit jobs: claim format, spam/abuse/personal-data, duplicate is partial (similar claims only)
5. Dedicated APIs: `GET /api/source-check`, `GET /api/wayback`, `GET /api/fact-check-search` (logic exists only inside `POST /api/evidence`)
6. Feed visibility rules + two sections (**Reviewed Claims** first, then **Under Review**), processing gate during intake
7. Feed filters: risk, platform, date, evidence status, sort, reset (search/category/status exist)
8. Claim detail: intake status badge, evidence strength/confidence, corrections history, report-problem action, updated time
9. Review workspace: claim interpretation, supporting/contradicting/context analysis, date/location/scope quality checklist, evidence strength, confidence
10. Claim fields: `language`, `location`, `context`, `intakeCompletedAt`, `intakeError`, visibility flags, `versionNumber`, `submittedSessionId`, `corrections`
11. Supabase `schema.sql` (tables per spec) — folder exists but is empty; no integration yet
12. `.env.example` documenting optional keys

## Files to change

- `src/lib/types.ts` — new unions + Claim/PublishedReview/Correction/IntakeCheck fields
- `src/lib/meta.ts` — INTAKE/AUTOMATION/STRENGTH/CONFIDENCE meta; filter option lists
- `src/lib/claim-store.ts` — defaults, migration of legacy automationStatus values, corrections helpers
- `src/lib/automation.ts` — intake decision helpers, extended publish validation (analysis + strength + confidence + checklist)
- `src/lib/visibility.ts` (new) — feed visibility predicates
- `src/hooks/use-automation.ts` — new status names; set intake fields; partial completion
- `src/hooks/use-review-actions.ts` — publish extended fields
- `src/app/api/evidence/route.ts` — format/spam jobs; shared source/wayback/fact helpers
- `src/app/api/source-check/route.ts` (new)
- `src/app/api/wayback/route.ts` (new)
- `src/app/api/fact-check-search/route.ts` (new)
- `src/lib/source-check.ts` (new) — shared SSRF-safe URL validation + fetch
- `src/components/feed/feed-browser.tsx` — two sections + full filters
- `src/components/claims/claim-detail.tsx` — intake, strength/confidence, corrections, report
- `src/components/claims/human-review-panel.tsx` — strength/confidence display
- `src/components/claims/automation-panel.tsx` — new automation/intake status labels
- `src/components/review/review-workspace.tsx` — analysis fields, checklist, strength, confidence
- `src/components/claims/claim-card.tsx` — visibility-aware badges if needed
- `src/lib/risk-analysis.ts` — add missing sensational phrases from spec (`must share`, `viral truth`, `secret revealed`, `unbelievable`, `share before deleted`)
- `scripts/check-dual-layer.mjs`, `scripts/check-dual-layer-ui.mjs` — align to new statuses + extended publish fields
- `src/lib/claims.ts` — keep server-safe; no behavior change required
- `.env.example` (new)
- `supabase/schema.sql` (new)

## Files to create

- `src/lib/visibility.ts`
- `src/lib/source-check.ts`
- `src/app/api/source-check/route.ts`
- `src/app/api/wayback/route.ts`
- `src/app/api/fact-check-search/route.ts`
- `supabase/schema.sql`
- `.env.example`

## Risks discovered

- Existing browser tests assert `automationStatus === "complete"` and publish with only note+URL; must update tests when statuses and publish requirements expand (spec requires analysis fields + strength + confidence + quality checklist).
- localStorage claims written with legacy statuses need a read-time migration or UI/meta will break (`Record<AutomationStatus, …>`).
- Feed visibility gates must not hide claims after automation completes or case-10 / feed tests fail.
- SSRF rules on source-check must block localhost/private IPs without breaking `example.com` tests.
- No Supabase credentials in `.env.local`; integration must be optional and clearly labeled — never silent fake data in production.
- Concurrent UI state: automation completion must still not clobber human `publishedReview` (already fixed once — preserve).

## Assumptions

- Supabase schema is authored now; applying it in the dashboard and setting env vars remains a deploy step (no service-role keys in the client).
- Google Fact Check API uses `GOOGLE_FACTCHECK_API_KEY` when present; otherwise the API returns “not configured” (no fake results).
- `FACTCHECK_API_URL` continues to work as an optional alternate endpoint.
- Quality checklist = date, location, and scope confirmed by the reviewer.
- Spam/abuse/PII check is a conservative content heuristic (blocks only clearly abusive patterns), not an auto-verdict.
- Local development fallback = localStorage mirror of the shared server store (`/api/claims` → `data/claims.json`); UI copy reflects the shared queue. Optional Supabase integration can replace the file store later.
