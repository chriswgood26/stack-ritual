-- Adds an optional start date anchor for less-than-daily stack items.
-- Used by the next-due calculation: when start_date is set and is later than the
-- most recent daily_log (or the item has never been logged), the schedule is
-- anchored to start_date. When the user edits the timing dropdown in the UI,
-- start_date is set to "today" to signal a schedule restart.

alter table user_stacks
  add column if not exists start_date date;
