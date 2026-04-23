-- Append-only ledger of commissions earned by affiliates. One row per Stripe
-- invoice.paid event (dedup'd by stripe_event_id). Refunds and disputes append
-- negative rows so the running total stays accurate.

create table if not exists affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  user_id text not null,
  stripe_event_id text not null unique,
  stripe_invoice_id text,
  stripe_charge_id text,
  amount_cents integer not null,
  commission_cents integer not null,
  commission_type text not null,
  plan text,
  billing_interval text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_affiliate_commissions_affiliate on affiliate_commissions(affiliate_id, occurred_at desc);
create index if not exists idx_affiliate_commissions_user on affiliate_commissions(user_id);

notify pgrst, 'reload schema';
