-- Per-item cooldown for low-supply alerts. The /api/cron/low-supply route
-- writes this timestamp after a successful send and skips items still
-- inside the 14-day cooldown window. NULL means "never alerted yet".
-- See docs/superpowers/specs/2026-04-27-email-reduction-and-analysis-ux-design.md

alter table user_stacks
  add column if not exists last_low_supply_alert_sent_at timestamptz;
