-- PromptStats Supabase Schema
-- Privacy-by-design: raw prompt text is null by default.
-- Run via Supabase Dashboard → SQL Editor, or supabase db push.

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Main prompts table ────────────────────────────────────────────────────
create table if not exists public.prompts (
  id            uuid          primary key default gen_random_uuid(),
  created_at    timestamptz   not null default now(),

  -- Source
  platform      text          check (platform in ('chatgpt','gemini','claude','aistudio','unknown')),

  -- Token metrics
  tokens        integer       not null check (tokens >= 0),
  words         integer       check (words >= 0),

  -- Environmental footprint (per prompt)
  co2_g         numeric(12,6) check (co2_g >= 0),
  water_ml      numeric(12,6) check (water_ml >= 0),
  energy_wh     numeric(12,6) check (energy_wh >= 0),

  -- File attachment count
  file_count    smallint      default 0,

  -- PII metadata — only detected TYPES, never raw text
  pii_types     text[]        default '{}',

  -- Privacy-safe prompt fingerprint (SHA-256 hex, 64 chars)
  prompt_hash   char(64),

  -- Raw prompt text — NULL unless user explicitly opted in (storeRawPrompts: true)
  -- Stored encrypted at rest via Supabase Vault if available
  prompt_text   text          default null
);

-- Indexes for common query patterns
create index if not exists idx_prompts_platform   on public.prompts(platform);
create index if not exists idx_prompts_created_at on public.prompts(created_at desc);
create index if not exists idx_prompts_hash        on public.prompts(prompt_hash)
  where prompt_hash is not null;

-- ─── Aggregate daily stats view ───────────────────────────────────────────
create or replace view public.daily_stats as
select
  date_trunc('day', created_at) as day,
  platform,
  count(*)                       as prompt_count,
  sum(tokens)                    as total_tokens,
  sum(co2_g)                     as total_co2_g,
  sum(water_ml)                  as total_water_ml,
  sum(energy_wh)                 as total_energy_wh,
  avg(tokens)                    as avg_tokens_per_prompt,
  sum(file_count)                as total_files
from public.prompts
group by 1, 2
order by 1 desc, 2;

-- ─── Row Level Security ────────────────────────────────────────────────────
-- Inserts are allowed for the anon key (extension writes).
-- Reads are restricted to authenticated users (your dashboard).
alter table public.prompts enable row level security;

create policy "Allow anon insert"
  on public.prompts for insert
  to anon
  with check (true);

create policy "Allow authenticated select"
  on public.prompts for select
  to authenticated
  using (true);

-- ─── Data retention function (GDPR Art. 5(1)(e) — storage limitation) ─────
-- Auto-deletes rows older than 90 days when called by a cron job.
create or replace function public.purge_old_prompts()
returns integer language plpgsql as $$
declare
  deleted_count integer;
begin
  delete from public.prompts
  where created_at < now() - interval '90 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on table  public.prompts         is 'One row per prompt submission. prompt_text is null by default (GDPR data minimisation).';
comment on column public.prompts.prompt_hash is 'SHA-256 of raw prompt text. One-way only — used for deduplication, not retrieval.';
comment on column public.prompts.prompt_text is 'Raw prompt text. Null unless user explicitly opted in via extension settings.';
