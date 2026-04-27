-- Master "unsubscribe from all emails" override on user profile. When true,
-- every email-sending cron skips this user before consulting individual
-- per-channel toggles. Default false keeps existing users in current state.

alter table user_profiles
  add column if not exists email_unsubscribed_all boolean not null default false;
