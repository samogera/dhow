-- Free is 50 MB whether verified or not: more space comes with a paid plan.
create or replace function storage_cap_bytes(p plan_tier, v verification_state) returns bigint
language sql immutable as $$
  select case p
    when 'free' then 50::bigint * 1024 * 1024
    when 'starter' then 500::bigint * 1024 * 1024
    when 'growth' then 2048::bigint * 1024 * 1024
    when 'market_entry' then 10240::bigint * 1024 * 1024
  end;
$$;

-- Vetted investors Dhow can introduce Premium and Enterprise members to.
create table if not exists investors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'fund',          -- fund, angel, bank, dfi, corporate, grant
  about text,
  sectors text[] not null default '{}',
  stages text[] not null default '{}',        -- idea, early, growth, established
  ticket text,                                -- e.g. "USD 50k to 500k"
  countries text,
  website text,
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table investors enable row level security;
create policy investors_staff on investors for all using (is_staff()) with check (is_staff());
create policy investors_members on investors for select using (active and auth.uid() is not null);

-- Everything members ask Dhow for: introductions to members or investors, and representation at events.
create table if not exists member_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  user_id uuid references auth.users on delete set null,
  kind text not null check (kind in ('member_intro', 'investor_intro', 'event_representation')),
  target_id uuid,
  target_name text,
  note text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'done', 'declined')),
  staff_note text,
  created_at timestamptz not null default now()
);
create index if not exists member_requests_status on member_requests (status, created_at desc);
create unique index if not exists member_requests_open_once on member_requests (org_id, kind, target_id) where status in ('new', 'in_progress');
alter table member_requests enable row level security;
create policy member_requests_staff on member_requests for all using (is_staff()) with check (is_staff());
create policy member_requests_read on member_requests for select using (is_member(org_id));
