-- TruthLens submission safeguards for existing public.claims deployments.
-- Apply after 20260925000001_canonical_claims_schema.sql.

alter table public.claims add column if not exists lifecycle_state text not null default 'submitted';
alter table public.claims add column if not exists idempotency_key text;
alter table public.claims add column if not exists normalized_fingerprint text;
alter table public.claims add column if not exists submitter_token_hash text;
alter table public.claims add column if not exists delete_requested_at timestamptz;

alter table public.claims drop constraint if exists claims_lifecycle_state_check;
alter table public.claims add constraint claims_lifecycle_state_check
  check (lifecycle_state in ('submitted','duplicate_check','intake_checking','under_review','needs_context','blocked','published_review','correction_pending','corrected','soft_deleted'));

create unique index if not exists claims_idempotency_key_unique
  on public.claims (idempotency_key)
  where idempotency_key is not null;
create index if not exists claims_normalized_fingerprint_idx
  on public.claims (normalized_fingerprint);
create index if not exists claims_lifecycle_state_idx
  on public.claims (lifecycle_state);

revoke update on public.claims from anon, authenticated;
revoke delete on public.claims from anon, authenticated;
