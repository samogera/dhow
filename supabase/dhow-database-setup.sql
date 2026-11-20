-- =====================================================================
--  DHOW OS: ONE-TIME DATABASE SETUP
--
--  1. Put YOUR email between the quotes on the next line.
--  2. In Supabase: SQL Editor > New query > paste this whole file > Run.
--  3. Then go to the site and click "Create account" with that same email.
--     You will be the admin automatically.
-- =====================================================================
select set_config('dhow.admin_email', 'YOUR-EMAIL@dhowpartners.com', false);

-- Stop safely if this has already been run on this database.
do $$ begin
  if to_regclass('public.organizations') is not null then
    raise exception 'Dhow OS is already set up on this database. Nothing was changed. To make yourself admin, run only the last section of this file.';
  end if;
end $$;

-- Dhow OS initial schema.
-- Security model:
--   * Every table has row-level security ON.
--   * Members read only rows of organizations they belong to.
--   * Dhow staff (profiles.staff_role set) read the internal workspace.
--   * Sensitive writes (verification status, payments, storage counters, staff roles)
--     happen only on the server with the service role, after explicit checks.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------- enums
create type staff_role as enum ('reviewer', 'finance', 'admin');
create type org_role as enum ('owner', 'admin', 'member');
create type plan_tier as enum ('free', 'starter', 'growth', 'market_entry');
create type verification_state as enum ('unverified', 'pending', 'verified', 'rejected', 'expired');
create type verification_tier as enum ('manual', 'instant');
create type verification_request_status as enum ('awaiting_payment', 'pending', 'in_review', 'verified', 'rejected', 'failed');
create type doc_kind as enum ('cr12', 'certificate_of_incorporation', 'kra_pin', 'tax_compliance', 'director_id', 'pitch_deck', 'other');
create type doc_status as enum ('pending_upload', 'uploaded', 'approved', 'rejected');
create type payment_purpose as enum ('verification', 'subscription');
create type payment_status as enum ('pending', 'paid', 'failed', 'cancelled');
create type opportunity_kind as enum ('rfp', 'tender', 'grant', 'event', 'program');
create type application_status as enum ('draft', 'submitted', 'shortlisted', 'won', 'lost', 'withdrawn');
create type client_stage as enum ('onboarding', 'active', 'on_hold', 'completed', 'lost');
create type lead_status as enum ('new', 'contacted', 'call_booked', 'plan_sent', 'won', 'lost');
create type partner_relationship as enum ('service', 'referral', 'institution');
create type partner_status as enum ('vetting', 'approved', 'paused', 'rejected');
create type work_status as enum ('todo', 'in_progress', 'review', 'done');
create type priority as enum ('low', 'medium', 'high');
create type invoice_status as enum ('draft', 'sent', 'part_paid', 'paid', 'overdue', 'cancelled');
create type bill_status as enum ('unpaid', 'part_paid', 'paid');
create type notify_channel as enum ('email', 'sms');

-- ---------------------------------------------------------------- people
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  phone text,
  staff_role staff_role,
  created_at timestamptz not null default now()
);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  country text not null default 'Kenya',
  sector text,
  website text,
  brs_number text,
  kra_pin_enc text,            -- AES-256-GCM, encrypted by the app
  kra_pin_last4 text,
  plan plan_tier not null default 'free',
  verification_status verification_state not null default 'unverified',
  verified_at timestamptz,
  verified_until timestamptz,
  storage_used_bytes bigint not null default 0 check (storage_used_bytes >= 0),
  storage_reserved_bytes bigint not null default 0 check (storage_reserved_bytes >= 0),
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);

create table memberships (
  org_id uuid not null references organizations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index on memberships (user_id);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  email citext not null,
  role org_role not null default 'member',
  token_hash text not null unique,
  invited_by uuid references auth.users,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and staff_role is not null);
$$;

create or replace function has_staff_role(roles staff_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and (staff_role = any(roles) or staff_role = 'admin'));
$$;

create or replace function is_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where org_id = org and user_id = auth.uid());
$$;

create or replace function is_org_admin(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where org_id = org and user_id = auth.uid() and role in ('owner', 'admin'));
$$;

-- Storage cap by plan, raised for verified free members.
create or replace function storage_cap_bytes(p plan_tier, v verification_state) returns bigint
language sql immutable as $$
  select case p
    when 'free' then case when v = 'verified' then 500::bigint * 1024 * 1024 else 50::bigint * 1024 * 1024 end
    when 'starter' then 500::bigint * 1024 * 1024
    when 'growth' then 2048::bigint * 1024 * 1024
    when 'market_entry' then 10240::bigint * 1024 * 1024
  end;
$$;

-- Atomically reserve space before an upload link is issued. Returns false when over quota.
create or replace function reserve_storage(p_org uuid, p_bytes bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  update organizations
     set storage_reserved_bytes = storage_reserved_bytes + p_bytes
   where id = p_org
     and storage_used_bytes + storage_reserved_bytes + p_bytes <= storage_cap_bytes(plan, verification_status)
  returning true into ok;
  return coalesce(ok, false);
end $$;

-- Move a reservation into used space once the upload is confirmed (actual size may be smaller).
create or replace function commit_storage(p_org uuid, p_reserved bigint, p_actual bigint) returns void
language sql security definer set search_path = public as $$
  update organizations
     set storage_reserved_bytes = greatest(storage_reserved_bytes - p_reserved, 0),
         storage_used_bytes = storage_used_bytes + p_actual
   where id = p_org;
$$;

create or replace function release_storage(p_org uuid, p_reserved bigint, p_used bigint default 0) returns void
language sql security definer set search_path = public as $$
  update organizations
     set storage_reserved_bytes = greatest(storage_reserved_bytes - p_reserved, 0),
         storage_used_bytes = greatest(storage_used_bytes - p_used, 0)
   where id = p_org;
$$;

-- Only the server (service role) may call the storage functions.
revoke execute on function reserve_storage(uuid, bigint) from public, anon, authenticated;
revoke execute on function commit_storage(uuid, bigint, bigint) from public, anon, authenticated;
revoke execute on function release_storage(uuid, bigint, bigint) from public, anon, authenticated;

-- Fixed-window rate limiter used by API routes. Returns true while under the limit.
create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);

create or replace function hit_rate_limit(p_key text, p_window_seconds int, p_max int) returns boolean
language plpgsql security definer set search_path = public as $$
declare w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
        n int;
begin
  insert into rate_limits (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into n;
  return n <= p_max;
end $$;
revoke execute on function hit_rate_limit(text, int, int) from public, anon, authenticated;

-- ---------------------------------------------------------------- documents, verification, payments
create table documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  uploaded_by uuid references auth.users,
  kind doc_kind not null,
  file_name text not null,
  object_key text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  status doc_status not null default 'pending_upload',
  review_note text,
  created_at timestamptz not null default now()
);
create index on documents (org_id, created_at desc);

create table verifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  tier verification_tier not null,
  status verification_request_status not null,
  provider text,
  provider_ref text,
  result jsonb,
  reviewer_id uuid references auth.users,
  review_note text,
  decided_at timestamptz,
  requested_by uuid references auth.users,
  created_at timestamptz not null default now()
);
create index on verifications (status, created_at);
create index on verifications (org_id, created_at desc);

create table payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  purpose payment_purpose not null,
  reference_id uuid,           -- the verification or subscription this pays for
  phone text not null,
  amount_kes int not null check (amount_kes > 0),
  checkout_request_id text unique,
  merchant_request_id text,
  mpesa_receipt text unique,
  status payment_status not null default 'pending',
  result_desc text,
  raw jsonb,
  created_by uuid references auth.users,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index on payments (org_id, created_at desc);

create table subscriptions (
  org_id uuid primary key references organizations on delete cascade,
  plan plan_tier not null,
  monthly_fee_kes int not null,
  paid_until date,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- marketplace
create table opportunities (
  id uuid primary key default gen_random_uuid(),
  kind opportunity_kind not null,
  title text not null,
  summary text not null default '',
  body text not null default '',
  source text,                 -- KenInvest, KNCCI, an embassy, a donor...
  url text,
  location text,
  deadline date,
  requires_verified boolean not null default true,
  published boolean not null default false,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);
create index on opportunities (published, deadline);

create table applications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  opportunity_id uuid not null references opportunities on delete cascade,
  status application_status not null default 'draft',
  note text,
  staff_note text,
  submitted_by uuid references auth.users,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, opportunity_id)
);

-- ---------------------------------------------------------------- internal workspace (staff only)
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector text,
  client_type text,
  stage client_stage not null default 'onboarding',
  email text,
  phone text,
  website text,
  country text default 'Kenya',
  notes text,
  org_id uuid references organizations on delete set null,
  account_lead uuid references profiles,
  created_at timestamptz not null default now()
);

create table partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discipline text,
  relationship partner_relationship not null default 'service',
  status partner_status not null default 'vetting',
  commission_terms text,
  website text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  email text,
  phone text,
  client_id uuid references clients on delete set null,
  partner_id uuid references partners on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  phone text,
  source text,
  status lead_status not null default 'new',
  est_value_kes numeric(14,2),
  next_step text,
  next_step_date date,
  owner uuid references profiles,
  client_id uuid references clients on delete set null,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references clients on delete set null,
  status work_status not null default 'todo',
  priority priority not null default 'medium',
  start_date date,
  due_date date,
  fee_kes numeric(14,2),
  owner uuid references profiles,
  description text,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  title text not null,
  status work_status not null default 'todo',
  priority priority not null default 'medium',
  due_date date,
  assignee uuid references profiles,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index on tasks (status, due_date);

create sequence invoice_number_seq start 2;  -- invoice 001 was issued before the platform

create table invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default lpad(nextval('invoice_number_seq')::text, 3, '0'),
  client_id uuid not null references clients,
  project_id uuid references projects on delete set null,
  issue_date date not null default current_date,
  due_date date not null,
  vat_rate numeric(5,2) not null default 16 check (vat_rate between 0 and 100),
  status invoice_status not null default 'draft',
  notes text,
  subtotal_kes numeric(14,2) not null default 0,
  vat_kes numeric(14,2) not null default 0,
  total_kes numeric(14,2) not null default 0,
  paid_kes numeric(14,2) not null default 0,
  sent_at timestamptz,
  created_by uuid references profiles,
  created_at timestamptz not null default now()
);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices on delete cascade,
  description text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price_kes numeric(14,2) not null check (unit_price_kes >= 0),
  sort int not null default 0
);

create table invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices on delete cascade,
  amount_kes numeric(14,2) not null check (amount_kes > 0),
  method text not null default 'M-Pesa',
  reference text,
  paid_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table bills (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references partners on delete set null,
  project_id uuid references projects on delete set null,
  description text not null,
  amount_kes numeric(14,2) not null check (amount_kes > 0),
  paid_kes numeric(14,2) not null default 0,
  due_date date,
  status bill_status not null default 'unpaid',
  created_at timestamptz not null default now()
);

create table wiki_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  section text not null default 'General',
  body text not null default '',
  updated_by uuid references profiles,
  updated_at timestamptz not null default now()
);

create table links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null check (url ~* '^https?://'),
  category text not null default 'Tools',
  notes text,
  created_at timestamptz not null default now()
);

create table calendar_connections (
  user_id uuid primary key references auth.users on delete cascade,
  google_email text,
  refresh_token_enc text not null,
  connected_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations on delete set null,
  channel notify_channel not null,
  template text not null,
  to_address text not null,
  status text not null default 'queued',
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  table_name text not null,
  row_id text,
  diff jsonb,
  at timestamptz not null default now()
);

-- ---------------------------------------------------------------- triggers
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.raw_user_meta_data->>'phone');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Keep invoice totals in step with its items and payments.
create or replace function recalc_invoice(p_invoice uuid) returns void
language plpgsql security definer set search_path = public as $$
declare sub numeric(14,2); paid numeric(14,2); rate numeric(5,2); due date; st invoice_status;
begin
  select coalesce(sum(round(quantity * unit_price_kes, 2)), 0) into sub from invoice_items where invoice_id = p_invoice;
  select coalesce(sum(amount_kes), 0) into paid from invoice_payments where invoice_id = p_invoice;
  select vat_rate, due_date, status into rate, due, st from invoices where id = p_invoice;
  update invoices set
    subtotal_kes = sub,
    vat_kes = round(sub * rate / 100, 2),
    total_kes = sub + round(sub * rate / 100, 2),
    paid_kes = paid,
    status = case
      when st in ('draft', 'cancelled') then st
      when paid >= sub + round(sub * rate / 100, 2) and sub > 0 then 'paid'
      when paid > 0 then 'part_paid'
      when due < current_date then 'overdue'
      else 'sent' end
  where id = p_invoice;
end $$;

create or replace function trg_recalc_invoice() returns trigger
language plpgsql as $$
begin
  perform recalc_invoice(coalesce(new.invoice_id, old.invoice_id));
  return null;
end $$;
create trigger invoice_items_recalc after insert or update or delete on invoice_items
  for each row execute function trg_recalc_invoice();
create trigger invoice_payments_recalc after insert or update or delete on invoice_payments
  for each row execute function trg_recalc_invoice();

create or replace function trg_bill_status() returns trigger
language plpgsql as $$
begin
  new.status := case when new.paid_kes >= new.amount_kes then 'paid'
                     when new.paid_kes > 0 then 'part_paid' else 'unpaid' end;
  return new;
end $$;
create trigger bills_status before insert or update on bills
  for each row execute function trg_bill_status();

-- Audit trail on sensitive tables.
create or replace function trg_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor, action, table_name, row_id, diff)
  values (auth.uid(), tg_op, tg_table_name,
          coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id', to_jsonb(new)->>'org_id'),
          case tg_op when 'DELETE' then to_jsonb(old) - 'kra_pin_enc'
                     else jsonb_build_object('new', to_jsonb(new) - 'kra_pin_enc') end);
  return coalesce(new, old);
end $$;
create trigger audit_organizations after insert or update or delete on organizations for each row execute function trg_audit();
create trigger audit_verifications after insert or update or delete on verifications for each row execute function trg_audit();
create trigger audit_payments after insert or update or delete on payments for each row execute function trg_audit();
create trigger audit_documents after insert or update or delete on documents for each row execute function trg_audit();
create trigger audit_invoices after insert or update or delete on invoices for each row execute function trg_audit();
create trigger audit_memberships after insert or update or delete on memberships for each row execute function trg_audit();
create trigger audit_profiles after update on profiles for each row execute function trg_audit();

-- ---------------------------------------------------------------- row-level security
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table memberships enable row level security;
alter table invitations enable row level security;
alter table rate_limits enable row level security;
alter table documents enable row level security;
alter table verifications enable row level security;
alter table payments enable row level security;
alter table subscriptions enable row level security;
alter table opportunities enable row level security;
alter table applications enable row level security;
alter table clients enable row level security;
alter table partners enable row level security;
alter table contacts enable row level security;
alter table leads enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table invoice_payments enable row level security;
alter table bills enable row level security;
alter table wiki_pages enable row level security;
alter table links enable row level security;
alter table calendar_connections enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;

-- profiles: see yourself, staff see everyone; you may edit your own name and phone only.
create policy profiles_select on profiles for select using (id = auth.uid() or is_staff());
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on profiles from authenticated;
grant update (full_name, phone) on profiles to authenticated;

-- organizations: members and staff read; org admins edit descriptive fields only.
create policy orgs_select on organizations for select using (is_member(id) or is_staff());
create policy orgs_update on organizations for update using (is_org_admin(id)) with check (is_org_admin(id));
revoke update on organizations from authenticated;
grant update (name, country, sector, website) on organizations to authenticated;

create policy memberships_select on memberships for select using (is_member(org_id) or is_staff());
create policy invitations_select on invitations for select using (is_org_admin(org_id) or is_staff());

create policy documents_select on documents for select using (is_member(org_id) or is_staff());
create policy verifications_select on verifications for select using (is_member(org_id) or is_staff());
create policy payments_select on payments for select using (is_member(org_id) or has_staff_role(array['finance']::staff_role[]));
create policy subscriptions_select on subscriptions for select using (is_member(org_id) or is_staff());

-- opportunities: anyone may browse published ones; staff manage all.
create policy opps_public on opportunities for select using (published or is_staff());
create policy opps_staff_write on opportunities for all using (is_staff()) with check (is_staff());

-- applications: members manage their own drafts; staff see and update all.
create or replace function can_apply(p_org uuid, p_opp uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from opportunities o, organizations g
     where o.id = p_opp and g.id = p_org and o.published
       and (o.deadline is null or o.deadline >= current_date)
       and (not o.requires_verified or g.verification_status = 'verified'));
$$;

create policy apps_select on applications for select using (is_member(org_id) or is_staff());
create policy apps_insert on applications for insert with check (is_member(org_id) and can_apply(org_id, opportunity_id));
create policy apps_update_member on applications for update using (is_member(org_id) and status in ('draft', 'submitted'))
  with check (is_member(org_id) and status in ('draft', 'submitted', 'withdrawn'));
create policy apps_update_staff on applications for update using (is_staff()) with check (is_staff());
-- Members may change only status and their note; staff notes are written by the server.
revoke update on applications from authenticated;
grant update (status, note, submitted_at) on applications to authenticated;

-- internal workspace: staff only. Money tables: finance or admin.
create policy staff_all on clients for all using (is_staff()) with check (is_staff());
create policy staff_all on partners for all using (is_staff()) with check (is_staff());
create policy staff_all on contacts for all using (is_staff()) with check (is_staff());
create policy staff_all on leads for all using (is_staff()) with check (is_staff());
create policy staff_all on projects for all using (is_staff()) with check (is_staff());
create policy staff_all on tasks for all using (is_staff()) with check (is_staff());
create policy staff_all on wiki_pages for all using (is_staff()) with check (is_staff());
create policy staff_all on links for all using (is_staff()) with check (is_staff());
create policy finance_all on invoices for all using (has_staff_role(array['finance']::staff_role[])) with check (has_staff_role(array['finance']::staff_role[]));
create policy finance_all on invoice_items for all using (has_staff_role(array['finance']::staff_role[])) with check (has_staff_role(array['finance']::staff_role[]));
create policy finance_all on invoice_payments for all using (has_staff_role(array['finance']::staff_role[])) with check (has_staff_role(array['finance']::staff_role[]));
create policy finance_all on bills for all using (has_staff_role(array['finance']::staff_role[])) with check (has_staff_role(array['finance']::staff_role[]));
create policy calendar_own on calendar_connections for select using (user_id = auth.uid());
create policy notifications_staff on notifications for select using (is_staff());
create policy audit_admin on audit_log for select using (has_staff_role(array['admin']::staff_role[]));
-- rate_limits: no policies, so only the service role can touch it.

grant usage on sequence invoice_number_seq to authenticated;
revoke execute on function recalc_invoice(uuid) from public, anon;
revoke execute on function handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------- reporting view
create or replace view finance_position with (security_invoker = true) as
select
  coalesce((select sum(paid_kes) from invoices where status <> 'cancelled'), 0)               as received_kes,
  coalesce((select sum(total_kes - paid_kes) from invoices where status in ('sent', 'part_paid', 'overdue')), 0) as owed_by_clients_kes,
  coalesce((select sum(paid_kes) from bills), 0)                                              as paid_out_kes,
  coalesce((select sum(amount_kes - paid_kes) from bills where status <> 'paid'), 0)          as owed_to_partners_kes;

-- Staff invites: give a role to an email before that person has an account.
-- When someone signs up with an invited email, they get the role automatically.
create table if not exists staff_invites (
  email text primary key check (email = lower(email)),
  role staff_role not null,
  invited_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table staff_invites enable row level security;
-- No policies: only the server (service role) and the trigger below read or write it.

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare invited staff_role;
begin
  select role into invited from staff_invites where email = lower(new.email);
  insert into profiles (id, full_name, phone, staff_role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.raw_user_meta_data->>'phone', invited);
  if invited is not null then
    delete from staff_invites where email = lower(new.email);
  end if;
  return new;
end $$;
revoke execute on function handle_new_user() from public, anon, authenticated;

-- Hardening from the Supabase security advisor.

-- 1. Pin search_path on the remaining functions.
alter function storage_cap_bytes(plan_tier, verification_state) set search_path = public;
alter function trg_bill_status() set search_path = public;

-- 2. Invoice totals: the trigger runs with owner rights, so nobody needs to call recalc_invoice directly.
create or replace function trg_recalc_invoice() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform recalc_invoice(coalesce(new.invoice_id, old.invoice_id));
  return null;
end $$;
revoke execute on function recalc_invoice(uuid) from public, anon, authenticated;
revoke execute on function trg_recalc_invoice() from public, anon, authenticated;
revoke execute on function trg_audit() from public, anon, authenticated;

-- 3. Permission helpers: signed-out visitors never need them, except is_staff()
--    which the public opportunities policy uses (it only answers "is the caller staff?").
revoke execute on function is_member(uuid) from public, anon;
revoke execute on function is_org_admin(uuid) from public, anon;
revoke execute on function has_staff_role(staff_role[]) from public, anon;
revoke execute on function can_apply(uuid, uuid) from public, anon;
grant execute on function is_member(uuid), is_org_admin(uuid), has_staff_role(staff_role[]), can_apply(uuid, uuid) to authenticated;

-- ===================================================================== starting data (partners, clients, opportunities, wiki, links)
-- Starter data taken from the Dhow Partners Notion workspace.
-- Run once after the migration: supabase db reset (local) or paste into the SQL editor.

insert into partners (name, discipline, relationship, status, commission_terms, website, notes) values
  ('Binary One', 'Technology', 'referral', 'vetting', 'Managed IT: 15% of fees for the first 3 months. ERP: one-off 10%.', null, 'Sign the referral agreement, then approve.'),
  ('KenInvest (Kenya Investment Authority)', 'Government', 'institution', 'approved', null, 'https://www.invest.go.ke', 'Investor events and one-stop-centre guidance.'),
  ('KNCCI', 'Chamber', 'institution', 'approved', null, 'https://www.kenyachamber.or.ke', 'Chamber events and trade missions.'),
  ('British Chamber of Commerce Kenya', 'Chamber', 'institution', 'vetting', null, null, 'Network for foreign companies.'),
  ('African Private Capital Association (AVCA)', 'Investors', 'institution', 'vetting', null, null, 'Network for investors.');

insert into clients (name, sector, client_type, stage, country, notes) values
  ('Kivu Hospitality', 'Hospitality', 'Kenyan business', 'onboarding', 'Kenya', 'Kivu Resort, Msafiri Rift Lodge, Kivu Tours. Website and booking system, KES 600,000.'),
  ('Pals Group of Companies', 'Other', 'Kenyan business', 'active', 'Kenya', 'Nikko Homecare, Pals Travel & Leisure, Pals Academy.'),
  ('Jamafriq Global Consultancy', 'Education', 'Kenyan business', 'active', 'Kenya', 'Website redesign.'),
  ('Dunia Endelevu', 'Other', 'Kenyan business', 'active', 'Kenya', 'Website on its own domain.'),
  ('Ardena', null, 'Kenyan business', 'completed', 'Kenya', 'Company setup with partner lawyers.'),
  ('GridFlow Solar', 'Energy', 'Kenyan business', 'completed', 'Kenya', 'Setup and tech advice.');

insert into leads (name, company, status, est_value_kes, next_step, next_step_date, source)
values ('Business system for Homecare, Travel and School', 'Pals Group of Companies', 'plan_sent', 350000,
        'Follow up before the proposal expires on 23 Nov 2026.', '2026-11-20', 'Referral');

insert into opportunities (kind, title, summary, source, location, deadline, requires_verified, published) values
  ('event', 'Kenya Trade and Investment Roadshow 2026', 'Equity Group Holdings investors'' mission, 25 to 29 November 2026.', 'Equity Group', 'Nairobi', '2026-11-24', false, true),
  ('program', 'Dhow Partners Membership: round one', 'Applications open until 13 January 2027. Programme starts 18 January 2027.', 'Dhow Partners', 'Nairobi', '2027-01-13', false, true);

insert into wiki_pages (slug, title, section, body) values
  ('mission-vision-values', 'Mission, Vision, Values', 'Overview', E'# Mission, Vision, Values\n\nWrite the mission here.'),
  ('client-journey', 'Client journey', 'How we work', E'# Client journey\n\n1. Free first call (30 minutes)\n2. Written plan within 48 hours\n3. Coordination and weekly check-ins'),
  ('partner-vetting', 'Partner vetting', 'How we work', E'# Partner vetting\n\nFour checks before a firm gets client work: licence, references, past work, signed agreement.'),
  ('invoicing-and-payments', 'Invoicing and payments', 'Finance', E'# Invoicing and payments\n\nEvery invoice has a due date, a client and a project. Record each payment as it lands.');

insert into links (title, url, category) values
  ('Company website', 'https://dhowpartners.com', 'Brand'),
  ('Google Search Console', 'https://search.google.com/search-console', 'Marketing'),
  ('Notion workspace', 'https://app.notion.com', 'Tools');

-- Make yourself the first admin after signing up (replace the email):
-- update profiles set staff_role = 'admin' where id = (select id from auth.users where email = 'hello@dhowpartners.com');

-- =====================================================================
--  LAST SECTION: make the email at the top an admin.
--  Safe to run again on its own (copy from here down) if you need to.
-- =====================================================================
do $$
declare e text := lower(trim(current_setting('dhow.admin_email', true)));
begin
  if e is null or e = '' or e like 'your-email%' then
    raise notice 'No admin email set. Put your email on line 9 (near the top) and run the whole file again.';
    return;
  end if;
  -- If the account already exists, make it admin now; otherwise it becomes admin when you sign up.
  update profiles set staff_role = 'admin' where id in (select id from auth.users where lower(email) = e);
  if not found then
    insert into staff_invites (email, role) values (e, 'admin') on conflict (email) do update set role = 'admin';
    raise notice 'Done. Now create your account with % on the site and you will be admin.', e;
  else
    raise notice 'Done. % is now an admin. Sign in on the site.', e;
  end if;
end $$;
