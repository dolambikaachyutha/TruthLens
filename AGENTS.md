# TruthLens Development Rules

Build a professional civic-tech misinformation-triage platform.

Product:
TruthLens — See the signal. Follow the evidence.

Required features:
1. Submit a claim.
2. Automatic risk flags.
3. Reviewer workflow.
4. Public feed with category and status filters.
5. Claim detail view.

Important project rules:
- Do not implement login or signup.
- Do not require authentication.
- All features must be publicly accessible for hackathon grading.
- Risk flags are not factual verdicts.
- Never automatically label a claim true or false.
- Preserve original claim text and review history.
- Use neutral, evidence-first language.
- Use Next.js, TypeScript, Tailwind CSS, shadcn/ui, Motion, Supabase, Zod, React Hook Form, Sonner, and Playwright.
- Deploy as one Next.js Node Web Service on Render.
- Do not create a separate Express backend.
- Do not expose Supabase service-role keys.
- Do not commit secrets.
- The application must pass npm run build.
- Use accessible, responsive, professional UI.
- Provide loading, empty, success, and error states.
- Do not seed demo data; render honest empty states until real data is connected.
- Create README.md with the exact Hackathon ID placeholder.
- Create DECISIONS.md with DP1, DP2, and DP3.
- Do not claim standard API compliance unless an exact required API specification is implemented.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
