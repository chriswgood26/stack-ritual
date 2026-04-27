-- Per-finding follow-up Q&A on a stack analysis (Pro feature).
-- One row per question. (analysis_id, section, finding_index) identifies a
-- specific finding within an immutable analysis JSON. Cap of 20 followups
-- per analysis is enforced in /api/analysis/followups.
-- See docs/superpowers/specs/2026-04-26-stack-analysis-followups-design.md

create table if not exists analysis_followups (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references stack_analyses(id) on delete cascade,
  user_id text not null,

  section text not null check (section in ('synergies','interactions','timing','redundancies','recommendations')),
  finding_index int not null,

  question text not null,
  answer text not null,

  created_at timestamptz not null default now(),

  -- observability / cost
  model text not null,
  prompt_version int not null default 1,
  input_tokens int,
  output_tokens int,
  cached_input_tokens int,
  duration_ms int
);

create index if not exists analysis_followups_analysis_idx
  on analysis_followups (analysis_id, created_at);
create index if not exists analysis_followups_user_idx
  on analysis_followups (user_id);

alter table analysis_followups enable row level security;

create policy "users read own followups"
  on analysis_followups for select
  using (auth.jwt() ->> 'sub' = user_id);
-- writes are server-only via supabaseAdmin; no insert policy
