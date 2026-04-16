-- User Referral Program
-- Pro users refer friends → earn 1 free month per referral that subscribes to Pro (max 6)

create table public.user_referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_user_id text not null,           -- Clerk user ID of the person who referred
  referral_code text not null unique,       -- Short unique code for sharing
  referred_user_id text,                    -- Clerk user ID of the person who signed up (null until they sign up)
  referred_email text,                      -- Email captured at signup
  status text not null default 'pending'    -- pending (signed up, no Pro yet), credited (Pro sub, credit issued), expired
    check (status in ('pending', 'credited', 'expired')),
  stripe_balance_tx_id text,               -- Stripe balance transaction ID when credit was issued
  credit_amount_cents integer default 0,    -- Amount credited (999 = $9.99)
  created_at timestamptz not null default now(),
  credited_at timestamptz                   -- When the credit was issued
);

create index user_referrals_referrer_idx on public.user_referrals(referrer_user_id);
create index user_referrals_code_idx on public.user_referrals(referral_code);
create index user_referrals_referred_idx on public.user_referrals(referred_user_id);

-- View for referrer dashboard: total credits earned
-- select referrer_user_id, count(*) filter (where status = 'credited') as credits_earned
-- from user_referrals group by referrer_user_id;
