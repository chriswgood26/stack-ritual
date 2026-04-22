-- Affiliate program tables for Stack Ritual
-- Run this in your Supabase SQL Editor

create table if not exists affiliates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  email text,
  phone text,
  street text,
  city text,
  state text,
  zip text,
  country text,
  payout_method text check (payout_method in ('check', 'zelle', 'paypal', 'venmo', 'ach', 'other')),
  first_month_percentage numeric(5,2) not null default 50,
  recurring_percentage numeric(5,2) not null default 10,
  payout_details text,
  status text not null default 'active' check (status in ('pending', 'active', 'paused', 'terminated')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  amount numeric(10,2) not null,
  paid_date date not null default current_date,
  method text check (method in ('check', 'zelle', 'paypal', 'venmo', 'ach', 'other')),
  reference_number text,
  notes text,
  created_at timestamptz default now()
);

-- Referred signups — tracks which user signed up via which affiliate code
create table if not exists affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  affiliate_code text not null,
  user_id text, -- Clerk user ID, nullable until user signs up
  email text,
  created_at timestamptz default now(),
  first_payment_at timestamptz,
  subscription_active boolean default false
);

-- Affiliate program interest (signups from the public page)
create table if not exists affiliate_interest (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- Store-applicant fields (added 2026-04-22 for /affiliate, where we ship a
-- physical counter card to approved stores). Optional for creator applicants
-- arriving via /affiliate-program.
alter table affiliate_interest add column if not exists store_name text;
alter table affiliate_interest add column if not exists street_address text;
alter table affiliate_interest add column if not exists street_address_2 text;
alter table affiliate_interest add column if not exists city text;
alter table affiliate_interest add column if not exists state text;
alter table affiliate_interest add column if not exists zip text;

create index if not exists idx_affiliates_code on affiliates(code);
create index if not exists idx_affiliates_status on affiliates(status);
create index if not exists idx_affiliate_payouts_affiliate on affiliate_payouts(affiliate_id);
create index if not exists idx_affiliate_referrals_affiliate on affiliate_referrals(affiliate_id);
create index if not exists idx_affiliate_referrals_user on affiliate_referrals(user_id);

NOTIFY pgrst, 'reload schema';
