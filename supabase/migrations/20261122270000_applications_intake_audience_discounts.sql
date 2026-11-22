-- Who can see an opportunity or event: everyone, paying members (Startup and up), or Growth and up.
alter table opportunities add column if not exists audience text not null default 'all' check (audience in ('all', 'members', 'premium'));
update opportunities set audience = 'members' where members_only;

-- Cancelling a paid plan: it runs to its end date, then stops.
alter table organizations add column if not exists plan_cancelled_at timestamptz;

-- Discounts each plan gets on event representation and on Dhow services.
create table if not exists plan_discounts (
  tier text primary key check (tier in ('free', 'basic', 'premium', 'enterprise')),
  events_pct numeric(5,2) not null default 0 check (events_pct between 0 and 100),
  services_pct numeric(5,2) not null default 0 check (services_pct between 0 and 100),
  note text,
  updated_at timestamptz not null default now()
);
insert into plan_discounts (tier, events_pct, services_pct) values ('free', 0, 0), ('basic', 10, 5), ('premium', 20, 10), ('enterprise', 30, 15)
on conflict (tier) do nothing;
alter table plan_discounts enable row level security;
create policy plan_discounts_read on plan_discounts for select using (auth.uid() is not null);
create policy plan_discounts_staff on plan_discounts for all using (is_staff()) with check (is_staff());

-- Membership applications from dhowpartners.com/apply.
create table if not exists membership_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text, email text not null, phone text, company text, registered text, sector text, years text, revenue text,
  website text, plan text, heard text, needs text, goals text,
  consent boolean not null default false, investors boolean not null default false,
  status text not null default 'new' check (status in ('new', 'accepted', 'waitlisted', 'declined', 'joined')),
  staff_note text,
  thanks_sent_at timestamptz, decision_sent_at timestamptz, next_steps_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists membership_applications_status on membership_applications (status, created_at desc);
alter table membership_applications enable row level security;
create policy membership_applications_staff on membership_applications for all using (is_staff()) with check (is_staff());
