-- Add UTM columns to page_views for campaign attribution
-- Idempotent

alter table page_views
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text;

create index if not exists page_views_utm_source_idx on page_views (utm_source) where utm_source is not null;
create index if not exists page_views_utm_campaign_idx on page_views (utm_campaign) where utm_campaign is not null;
