-- SMS launch prep — user timezone, double opt-in, consent logging, delivery logs
-- Idempotent

-- Per-user IANA timezone (e.g. 'America/Los_Angeles'). Needed so the SMS cron
-- can convert "08:00 morning" (user-local) to an actual UTC fire time.
alter table user_profiles
  add column if not exists timezone text not null default 'America/Los_Angeles';

-- Double opt-in confirmation
alter table user_profiles
  add column if not exists sms_confirmed boolean not null default false;
alter table user_profiles
  add column if not exists sms_confirmation_sent_at timestamptz;

-- TCPA consent proof
alter table user_profiles
  add column if not exists sms_consent_at timestamptz;
alter table user_profiles
  add column if not exists sms_consent_ip text;
alter table user_profiles
  add column if not exists sms_consent_text text;

-- Delivery log — every outbound SMS gets a row here so we can audit, debug,
-- and answer carrier complaints.
create table if not exists sms_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  to_phone text not null,
  body text not null,
  kind text not null, -- 'reminder' | 'confirmation' | 'welcome' | 'test' | 'help' | 'stop_ack'
  twilio_sid text,
  status text, -- twilio response status
  error_code text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists sms_logs_user_idx on sms_logs (user_id, created_at desc);
create index if not exists sms_logs_created_idx on sms_logs (created_at desc);
