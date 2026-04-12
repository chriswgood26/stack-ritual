-- Add resupply_ordered column to user_stacks
-- Users can check this when they've ordered more of a supplement.
-- Automatically cleared when new quantity is added via QuantityAdjuster.

alter table user_stacks
  add column if not exists resupply_ordered boolean not null default false;
