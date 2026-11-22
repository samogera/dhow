-- Investors get a private link to see companies that asked to meet them and verified companies in their sectors.
alter table investors add column if not exists portal_token text unique;
alter table investors add column if not exists contact_name text;
create table if not exists investor_interest (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references investors on delete cascade,
  org_id uuid not null references organizations on delete cascade,
  response text not null check (response in ('interested', 'not_now')),
  note text check (char_length(note) <= 1000),
  seen_by_staff boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (investor_id, org_id)
);
alter table investor_interest enable row level security;
create policy investor_interest_staff on investor_interest for all using (is_staff()) with check (is_staff());
