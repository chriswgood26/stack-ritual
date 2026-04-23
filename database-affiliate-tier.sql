-- Unified affiliate tier system.
-- Distinguishes Tier 2 (Affiliate — cash commissions on monthly subs) from
-- Tier 3 (Super Affiliate — cash commissions on monthly + annual subs, can
-- offer discounted annual pricing). Tier 1 (Refer & Earn) lives in
-- `user_referrals` and is not in this table.

-- 1. Add columns (safe to re-run).
alter table affiliates add column if not exists tier text not null default 'affiliate';
alter table affiliates add column if not exists annual_flat_plus numeric(10,2) not null default 16.00;
alter table affiliates add column if not exists annual_flat_pro numeric(10,2) not null default 24.00;
alter table affiliate_interest add column if not exists source text;

-- 2. Backfill existing rows.
-- Any affiliate with a mailing address came through the store flow → super_affiliate.
-- Everyone else stays on the default 'affiliate'.
update affiliates set tier = 'super_affiliate'
  where tier = 'affiliate' and street is not null and street <> '';

-- Interest rows with a store_name or street_address came from /affiliate.
-- Others came from /affiliate-program.
update affiliate_interest set source = 'store'
  where source is null and (store_name is not null or street_address is not null);
update affiliate_interest set source = 'personal'
  where source is null;

-- 3. Index for tab filtering on the admin list.
create index if not exists idx_affiliates_tier on affiliates(tier);

-- 4. Force PostgREST to reload the schema.
notify pgrst, 'reload schema';
