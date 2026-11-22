-- Which partner firms work on which client, for what, and at what percentage.
create table if not exists client_partners (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete cascade,
  partner_id uuid not null references partners on delete cascade,
  service text check (char_length(service) <= 200),
  agreed_pct numeric(5,2) check (agreed_pct between 0 and 100),
  status text not null default 'active' check (status in ('active', 'done')),
  created_at timestamptz not null default now(),
  unique (client_id, partner_id, service)
);
alter table client_partners enable row level security;
create policy staff_all on client_partners for all using (is_staff()) with check (is_staff());

-- Bank balance entered from the statement (no bank feed yet).
alter table dhow_profile add column if not exists bank_balance numeric(14,2);
alter table dhow_profile add column if not exists bank_balance_at date;
