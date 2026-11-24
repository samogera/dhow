-- Investors describe how they invest, choose their own alerts, and see every notification Dhow sent them.
alter table investors add column if not exists instruments text[] not null default '{}';
alter table investors add column if not exists contact_role text check (contact_role is null or char_length(contact_role) <= 120);

-- Private to the investor and staff: never shown to members.
create table if not exists investor_settings (
  investor_id uuid primary key references investors on delete cascade,
  phone text check (phone is null or char_length(phone) <= 40),
  alert_new_request boolean not null default true,
  alert_intro_update boolean not null default true,
  alert_new_companies boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table investor_settings enable row level security;
create policy investor_settings_staff on investor_settings for all using (is_staff()) with check (is_staff());

create table if not exists investor_notifications (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references investors on delete cascade,
  kind text not null check (kind in ('request', 'intro', 'response', 'profile', 'news', 'message')),
  title text not null check (char_length(title) <= 200),
  body text check (body is null or char_length(body) <= 1000),
  org_id uuid references organizations on delete set null,
  emailed boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists investor_notifications_feed on investor_notifications (investor_id, created_at desc);
alter table investor_notifications enable row level security;
create policy investor_notifications_staff on investor_notifications for all using (is_staff()) with check (is_staff());
