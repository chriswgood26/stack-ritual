-- Page view tracking for Stack Ritual
-- Run this in your Supabase SQL Editor

create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_page_views_created on page_views(created_at);
create index if not exists idx_page_views_path on page_views(path);

NOTIFY pgrst, 'reload schema';
