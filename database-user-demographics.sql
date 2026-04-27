-- Demographics for AI Stack Analysis personalization.
-- All fields nullable. Sex stores 'male' | 'female' | NULL (NULL = "prefer not to say").
-- Birthday columns are independently nullable so the user can fill any subset
-- (e.g., month + day only enables birthday celebration without age personalization).
-- See docs/superpowers/specs/2026-04-26-stack-analysis-followups-design.md

alter table user_profiles
  add column if not exists sex text check (sex in ('male','female')),
  add column if not exists birth_month smallint check (birth_month between 1 and 12),
  add column if not exists birth_day   smallint check (birth_day between 1 and 31),
  add column if not exists birth_year  smallint check (birth_year between 1900 and 2026);
