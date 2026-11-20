-- Opportunities pulled in from public feeds and APIs, reviewed by staff before members see them.
create table if not exists opportunity_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'wordpress' check (kind in ('wordpress', 'rss', 'grants_gov')),
  url text not null unique check (url ~* '^https://'),
  active boolean not null default true,
  auto_publish boolean not null default false,
  requires_verified boolean not null default false,
  last_run_at timestamptz,
  last_count int,
  last_error text,
  created_at timestamptz not null default now()
);
alter table opportunity_sources enable row level security;
drop policy if exists staff_all on opportunity_sources;
create policy staff_all on opportunity_sources for all using (is_staff()) with check (is_staff());

alter table opportunities add column if not exists image_url text check (image_url is null or image_url ~* '^https://');
alter table opportunities add column if not exists eligibility text[] not null default '{}';
alter table opportunities add column if not exists benefits text[] not null default '{}';
alter table opportunities add column if not exists sectors text[] not null default '{}';
alter table opportunities add column if not exists source_id uuid references opportunity_sources (id) on delete set null;
alter table opportunities add column if not exists external_id text unique;
alter table opportunities add column if not exists imported_at timestamptz;
create index if not exists opportunities_imported on opportunities (imported_at desc) where imported_at is not null;

insert into opportunity_sources (name, kind, url) values
  ('Opportunities for Africans', 'wordpress', 'https://www.opportunitiesforafricans.com'),
  ('Opportunity Desk', 'wordpress', 'https://opportunitydesk.org')
on conflict (url) do nothing;
alter table opportunities add column if not exists dismissed_at timestamptz;
