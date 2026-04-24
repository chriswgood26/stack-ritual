-- user_profiles.updated_at — written by /api/sms/settings and
-- /api/profile/timezone. Was missing from the original Supabase-UI-created
-- table; surfaced when the SMS opt-in flow first hit production.
-- Idempotent.

alter table user_profiles
  add column if not exists updated_at timestamptz not null default now();

-- Auto-bump updated_at on any row update so we don't have to set it from
-- every writer.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_profiles_set_updated_at on user_profiles;
create trigger user_profiles_set_updated_at
  before update on user_profiles
  for each row execute function set_updated_at();

-- Refresh PostgREST schema cache so the column shows up immediately.
notify pgrst, 'reload schema';
