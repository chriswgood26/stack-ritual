-- Stack Analysis: stores one row per AI analysis run.
-- One row per (user, run). Latest row is what the analysis page renders.
-- See docs/superpowers/specs/2026-04-25-stack-ai-analysis-design.md

create table if not exists stack_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  created_at timestamptz not null default now(),

  -- input snapshot (used to compute "X items changed since last run")
  stack_snapshot jsonb not null,
  stack_item_count int not null,

  -- model output (post-grounded against `supplements`)
  analysis jsonb not null,
  model text not null,
  prompt_version int not null default 1,

  -- per-run audit of disclaimer state at the time of the run
  disclaimer_version_at_run int not null,

  -- observability / cost
  input_tokens int,
  output_tokens int,
  cached_input_tokens int,
  duration_ms int,

  -- run classification (drives rate limiter on /run)
  trigger text not null check (trigger in ('initial','stack_changed','manual_rerun'))
);

create index if not exists stack_analyses_user_created_idx
  on stack_analyses (user_id, created_at desc);

alter table stack_analyses enable row level security;

create policy "users read own analyses"
  on stack_analyses for select
  using (auth.jwt() ->> 'sub' = user_id);

-- Writes are server-only via supabaseAdmin (service role); no insert policy needed.
