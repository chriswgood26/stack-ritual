-- Affiliate annual perk — lets specific affiliates unlock annual billing for
-- their referrals. Without this flag, annual plans are not available.
-- Idempotent.

alter table affiliates
  add column if not exists offers_annual_perk boolean not null default false;

create index if not exists affiliates_annual_perk_idx on affiliates (code)
  where offers_annual_perk = true;
