-- TruthLens Supabase schema
-- Apply in the Supabase SQL dashboard. No authentication tables.
-- Never commit service-role keys.

create extension if not exists "pgcrypto";

-- The application stores the complete Claim object in this JSONB payload so
-- ─── CLAIMS ───────────────────────────────────────────────────────────
create table if not exists public.claims (
  id text primary key default gen_random_uuid()::text,
  text text not null,
  platform text,
  category text not null,
  source_url text,
  language text,
  location text,
  context text,
  status text not null default 'unverified'
    check (status in ('unverified','in_review','verified_true','verified_false','misleading')),
  intake_status text not null default 'submitted'
    check (intake_status in ('submitted','checking','ready_for_review','needs_more_context','blocked','failed')),
  automation_status text not null default 'queued'
    check (automation_status in ('not_started','queued','running','completed','partially_completed','failed')),
  risk_level text not null default 'low'
    check (risk_level in ('low','medium','high')),
  automated_evidence_count integer not null default 0,
  submitted_session_id text,
  intake_completed_at timestamptz,
  intake_error text,
  is_visible_in_under_review boolean not null default true,
  is_visible_in_reviewed_feed boolean not null default true,
  is_deleted boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  is_seed boolean not null default false,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version_number integer not null default 1
);

alter table public.claims add column if not exists is_deleted boolean not null default false;
alter table public.claims add column if not exists payload jsonb not null default '{}'::jsonb;

update public.claims c
set is_deleted = true
where c.payload->>'isDeleted' = 'true'
  and c.is_deleted = false;

-- ─── RISK_FLAGS ───────────────────────────────────────────────────────
create table if not exists public.risk_flags (
  id text primary key,
  claim_id text not null references public.claims(id) on delete cascade,
  flag_type text not null,
  label text not null,
  explanation text not null,
  rule_version text,
  created_at timestamptz not null default now()
);

-- ─── INTAKE_CHECKS ────────────────────────────────────────────────────
create table if not exists public.intake_checks (
  id text primary key,
  claim_id text not null references public.claims(id) on delete cascade,
  check_type text not null,
  status text not null
    check (status in ('queued','running','passed','warning','failed','blocked')),
  result text not null default '',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── EVIDENCE ─────────────────────────────────────────────────────────
create table if not exists public.evidence (
  id text primary key,
  claim_id text not null references public.claims(id) on delete cascade,
  title text not null,
  url text,
  source_type text,
  source_name text,
  external_rating text,
  http_status integer,
  final_url text,
  retrieved_at timestamptz,
  publication_date date,
  is_archived boolean not null default false,
  is_external_fact_check boolean not null default false,
  is_primary_source boolean not null default false,
  is_independent_source boolean not null default false,
  created_by text,
  created_at timestamptz not null default now()
);

-- ─── REVIEWS ──────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id text primary key,
  claim_id text not null references public.claims(id) on delete cascade,
  verdict text not null
    check (verdict in ('verified_true','verified_false','misleading')),
  note text not null,
  claim_interpretation text not null default '',
  supporting_analysis text not null default '',
  contradicting_analysis text not null default '',
  context_analysis text not null default '',
  evidence_strength text not null default 'insufficient'
    check (evidence_strength in ('insufficient','limited','moderate','strong')),
  confidence text not null default 'medium'
    check (confidence in ('low','medium','high')),
  reviewer_label text not null default 'Community reviewer',
  reviewer_session_id text,
  conflict_warning_shown boolean not null default false,
  demo_override boolean not null default false,
  quality_check_passed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── TIMELINE_EVENTS ──────────────────────────────────────────────────
create table if not exists public.timeline_events (
  id text primary key,
  claim_id text not null references public.claims(id) on delete cascade,
  event_type text not null,
  description text not null,
  created_at timestamptz not null default now()
);

-- ─── SIMILAR_CLAIM_SUPPORTS ───────────────────────────────────────────
-- Public "same claim" support reports: one row per claim per browser
-- session. The feed shows only the aggregate count, never voter identity.
create table if not exists public.similar_claim_supports (
  id text primary key,
  claim_id text not null references public.claims(id) on delete cascade,
  session_id text not null,
  created_at timestamptz not null default now(),
  unique (claim_id, session_id)
);

-- ─── CORRECTIONS ──────────────────────────────────────────────────────
create table if not exists public.corrections (
  id text primary key,
  claim_id text not null references public.claims(id) on delete cascade,
  reason text not null,
  evidence_url text,
  status text not null default 'open'
    check (status in ('open','under_review','resolved','rejected')),
  response text,
  submitted_by text not null default 'Public report',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ─── CLAIM_VERSIONS ───────────────────────────────────────────────────
create table if not exists public.claim_versions (
  id text primary key,
  claim_id text not null references public.claims(id) on delete cascade,
  text text not null,
  source_url text,
  change_reason text not null,
  changed_by text not null default 'system',
  created_at timestamptz not null default now()
);

create index if not exists claims_status_idx on public.claims(status);
create index if not exists claims_intake_idx on public.claims(intake_status);
create index if not exists claims_submitted_idx on public.claims(submitted_at desc);
create index if not exists claims_public_feed_idx
  on public.claims(submitted_at desc) where is_deleted = false;
drop policy if exists "public read claims" on public.claims;
drop policy if exists "public insert claims" on public.claims;
drop policy if exists "public update claims" on public.claims;
create policy "public read claims" on public.claims
  for select to anon, authenticated using (is_deleted = false);
create policy "public insert claims" on public.claims
  for insert to anon, authenticated
  with check (
    is_deleted = false
    and status = 'unverified'
    and (payload->>'claimStatus') = 'unverified'
    and (payload->>'publishedReview') is null
  );
revoke update on public.claims from anon, authenticated;
create index if not exists risk_flags_claim_idx on public.risk_flags(claim_id);
create index if not exists intake_checks_claim_idx on public.intake_checks(claim_id);
create index if not exists evidence_claim_idx on public.evidence(claim_id);
create index if not exists reviews_claim_idx on public.reviews(claim_id);
create index if not exists timeline_claim_idx on public.timeline_events(claim_id);
create index if not exists corrections_claim_idx on public.corrections(claim_id);
create index if not exists similar_supports_claim_idx on public.similar_claim_supports(claim_id);

-- RLS: public reads for safe feed records. Writes are limited by the claim
-- policies below; service-role keys are never exposed to the client.
alter table public.claims enable row level security;
alter table public.risk_flags enable row level security;
alter table public.intake_checks enable row level security;
alter table public.evidence enable row level security;
alter table public.reviews enable row level security;
alter table public.timeline_events enable row level security;
alter table public.corrections enable row level security;
alter table public.claim_versions enable row level security;
alter table public.similar_claim_supports enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.claims to anon, authenticated;
grant select on public.risk_flags, public.intake_checks, public.evidence,
  public.reviews, public.timeline_events, public.corrections, public.claim_versions
  to anon, authenticated;

drop policy if exists "public read risk_flags" on public.risk_flags;
drop policy if exists "public read intake_checks" on public.intake_checks;
drop policy if exists "public read evidence" on public.evidence;
drop policy if exists "public read reviews" on public.reviews;
drop policy if exists "public read timeline" on public.timeline_events;
drop policy if exists "public read corrections" on public.corrections;
drop policy if exists "public read versions" on public.claim_versions;
drop policy if exists "public insert risk_flags" on public.risk_flags;
drop policy if exists "public insert intake_checks" on public.intake_checks;
drop policy if exists "public insert evidence" on public.evidence;
drop policy if exists "public insert reviews" on public.reviews;
drop policy if exists "public update reviews" on public.reviews;
drop policy if exists "public insert timeline" on public.timeline_events;
drop policy if exists "public insert corrections" on public.corrections;
drop policy if exists "public update corrections" on public.corrections;
drop policy if exists "public insert versions" on public.claim_versions;

create policy "public read risk_flags" on public.risk_flags for select using (true);
create policy "public read intake_checks" on public.intake_checks for select using (true);
create policy "public read evidence" on public.evidence for select using (true);
create policy "public read reviews" on public.reviews for select using (true);
create policy "public read timeline" on public.timeline_events for select using (true);
create policy "public read corrections" on public.corrections for select using (true);
create policy "public read versions" on public.claim_versions for select using (true);
create policy "public read similar supports" on public.similar_claim_supports for select using (true);

create policy "public insert risk_flags" on public.risk_flags for insert with check (true);
create policy "public insert intake_checks" on public.intake_checks for insert with check (true);
create policy "public insert evidence" on public.evidence for insert with check (true);
create policy "public insert reviews" on public.reviews for insert with check (true);
create policy "public update reviews" on public.reviews for update using (true);
create policy "public insert timeline" on public.timeline_events for insert with check (true);
create policy "public insert corrections" on public.corrections for insert with check (true);
create policy "public update corrections" on public.corrections for update using (true);
create policy "public insert versions" on public.claim_versions for insert with check (true);
create policy "public insert similar supports" on public.similar_claim_supports for insert with check (true);
