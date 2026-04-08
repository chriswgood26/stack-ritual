-- Add is_paused column to user_stacks
-- Lets users mark an item as currently inactive (not taking it now, but may resume).
-- Paused items remain visible on My Stack under an "Inactive" section but are
-- excluded from the Today page, reminders, and low-supply alerts.

alter table user_stacks
  add column if not exists is_paused boolean not null default false;

create index if not exists user_stacks_user_paused_idx
  on user_stacks (user_id, is_paused)
  where is_active = true;
