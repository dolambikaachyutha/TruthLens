For a deployed shared feed, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel, then run `supabase/schema.sql` in the Supabase SQL editor. The app stores the complete claim records in the `public.claims` table and reads them through the Next.js API. The public feed is shared across visitors through Supabase. Browser localStorage is not the source of truth; it is used only for demo session identification and temporary UI state. Never add `.env.local` or service-role keys to Git. Only the public anon key may be used by the client.
6. **Shared storage on Vercel:** run `supabase/schema.sql` and set both Supabase environment variables before deploying. Vercel then uses the persistent `public.claims` table for the shared feed.
# TruthLens

**See the signal. Follow the evidence.**

TruthLens is a public civic-tech platform for triaging potentially misleading claims. People can submit claims, inspect neutral risk signals, review available evidence, and record human review outcomes.

**Hackathon ID:** `[HACKATHON_ID_PLACEHOLDER]`  
**Authentication:** None. Login and signup are not required.  
**Automated verdicts:** Never. Risk analysis identifies presentation signals; it does not label a claim true or false.  
**External standard API:** Not implemented. The `/api/*` routes are internal Next.js handlers for evidence checks.

## What It Does

- Accepts claims with their original wording preserved.
- Runs neutral risk analysis for signals such as sensational language, shouting, and missing sources.
- Provides optional source reachability, metadata, Wayback, duplicate, and fact-check checks.
- Gives reviewers a public workflow for evidence notes, confidence, quality checks, and status history.
- Lets any visitor add an independent review from the feed; multiple reviewers may each record one assessment without publishing an official verdict.
- Provides a searchable feed with category, status, risk, platform, date, evidence, and sorting filters.
- Shows claim details, source links, corrections, evidence, signals, and review history.

## Routes

| Route | Purpose |
|---|---|
| `/` | Product overview and recent claims |
| `/submit` | Submit a claim and view risk signals |
| `/feed` | Browse and filter claims |
| `/claims/[id]` | View claim evidence and history |
| `/review` | Review claims and record findings |
| `/methodology` | Review standards and terminology |
| `/api/claims` | Shared local-server claim store (`data/claims.json`) |

## Technology

- Next.js 16 App Router and TypeScript
- Tailwind CSS v4 and shadcn/ui components
- React Hook Form and Zod validation
- Motion for React animations
- Shared claim storage through Supabase (`truthlens_claims` via `/api/claims`)
- Sonner notifications
- Playwright end-to-end tests

## Local Development

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The project does not seed demo claims. The public feed is shared across visitors through Supabase. Browser localStorage is not the source of truth; it is used only for demo session identification and temporary UI state.

### Environment Variables

Copy `.env.example` to `.env.local` when needed:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_FACTCHECK_API_KEY=
FACTCHECK_API_URL=
```

For a shared feed, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then run `supabase/schema.sql` in the Supabase SQL editor. The app stores the complete claim records in the `truthlens_claims` table and reads them through the Next.js API. Never add `.env.local` or service-role keys to Git. Only the public anon key may be used by the client.

## Validation

```bash
npm run lint
npm run build
npm run test:e2e
```

The production build must pass before deployment. Playwright may require its browser binaries to be installed in a new environment.

## Vercel Deployment

1. Push this repository to GitHub.
2. In Vercel, select **Add New Project** and import the GitHub repository.
3. Leave the framework as **Next.js** and use `npm run build` as the build command.
4. Add any required variables from `.env.example` under **Project Settings > Environment Variables**.
5. Deploy. Vercel will use `vercel.json` for the build settings and security headers. The public feed is shared across visitors through Supabase. Browser localStorage is not the source of truth; it is used only for demo session identification and temporary UI state.
6. **Shared storage on Vercel:** run `supabase/schema.sql` and set both Supabase environment variables before deploying. Vercel then uses the persistent `truthlens_claims` table for the shared feed. Without those variables, the local file fallback is not suitable for production persistence.

Do not add `SUPABASE_SERVICE_ROLE_KEY` to Vercel or expose it to the browser.

## Product Principles

- Risk flags are signals, not factual verdicts.
- Human review and traceable evidence are required for published findings.
- Original claim text and review history are preserved.
- Language remains neutral and evidence-first.
- No submitter account or personal information is required.
