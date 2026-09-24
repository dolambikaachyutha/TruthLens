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

## Technology

- Next.js 16 App Router and TypeScript
- Tailwind CSS v4 and shadcn/ui components
- React Hook Form and Zod validation
- Motion for React animations
- Supabase integration is optional
- Sonner notifications
- Playwright end-to-end tests

## Local Development

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The project does not seed demo claims. Without Supabase credentials, the app uses the browser's local storage and displays honest empty states until a claim is submitted.

### Environment Variables

Copy `.env.example` to `.env.local` when needed:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_FACTCHECK_API_KEY=
FACTCHECK_API_URL=
```

All variables are optional. Never add `.env.local` or service-role keys to Git. When using Supabase, apply `supabase/schema.sql` in the Supabase SQL editor. Only the public anon key may be used by the client.

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
5. Deploy. Vercel will use `vercel.json` for the build settings and security headers.

Do not add `SUPABASE_SERVICE_ROLE_KEY` to Vercel or expose it to the browser.

## Product Principles

- Risk flags are signals, not factual verdicts.
- Human review and traceable evidence are required for published findings.
- Original claim text and review history are preserved.
- Language remains neutral and evidence-first.
- No submitter account or personal information is required.
