-- Roadmap items for Stack Ritual admin
-- Lets the admin jot ideas, vet them, then mark as in-progress.
-- Items shipped should graduate into the release notes (manual move).

create table if not exists roadmap_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'idea' check (status in ('idea', 'vetted', 'in_progress')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roadmap_items_status_idx on roadmap_items (status, sort_order, created_at desc);

-- Seed with the current static items (idempotent — only inserts if table is empty)
insert into roadmap_items (title, status)
select * from (values
  ('SMS reminders via Twilio (pending A2P carrier approval)', 'in_progress'),
  ('Annual billing option', 'idea'),
  ('Dark mode', 'idea'),
  ('iOS/Android native app', 'idea'),
  ('Alexa/Google Home voice integration', 'idea'),
  ('Email receipt import for stack building', 'idea'),
  ('Testimonials on landing page', 'vetted'),
  ('UTM parameter parsing for traffic sources', 'idea'),
  ('Stripe webhook integration for affiliate revenue attribution', 'vetted'),
  ('Multi-capsule serving sizes — surface doses_per_serving in add/edit and decrement by serving on checkoff', 'vetted')
) as seed(title, status)
where not exists (select 1 from roadmap_items);
