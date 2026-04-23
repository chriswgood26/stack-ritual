-- Track when the welcome email was last sent to an affiliate so admins can
-- confirm they've been notified of their approval.

alter table affiliates
  add column if not exists last_welcome_email_sent_at timestamptz;

notify pgrst, 'reload schema';
