-- Tracks the most recent year a birthday email was successfully sent to the user.
-- Used by /api/cron/birthday-emails to dedupe across hourly runs and DST edges.
alter table user_profiles
  add column if not exists last_birthday_email_year smallint;
