-- Company profiles for members, partner details and files, people without system access, and Dhow's own profile.

-- 1. Member company profile (edited by the company's owners/admins through the app's server code).
alter table organizations add column if not exists logo_url text check (logo_url is null or logo_url ~* '^https://');
alter table organizations add column if not exists tagline text check (char_length(tagline) <= 160);
alter table organizations add column if not exists about text check (char_length(about) <= 3000);
alter table organizations add column if not exists phone text;
alter table organizations add column if not exists email text;
alter table organizations add column if not exists address text;
alter table organizations add column if not exists founded_year int check (founded_year between 1900 and 2100);
alter table organizations add column if not exists team_size text;
alter table organizations add column if not exists socials jsonb not null default '{}'::jsonb;

-- 2. Partners: industry, address, logo, socials.
alter table partners add column if not exists industry text;
alter table partners add column if not exists address text;
alter table partners add column if not exists logo_url text check (logo_url is null or logo_url ~* '^https://');
alter table partners add column if not exists socials jsonb not null default '{}'::jsonb;

-- 3. Internal files (partner certificates, company profiles, Dhow's own documents). Staff only.
create table if not exists internal_files (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('partner', 'dhow')),
  owner_id uuid,
  label text not null check (char_length(label) between 1 and 160),
  category text not null default 'other',
  file_name text not null,
  object_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  expires_on date,
  uploaded_by uuid references auth.users,
  created_at timestamptz not null default now()
);
create index if not exists internal_files_owner on internal_files (owner_type, owner_id);
alter table internal_files enable row level security;
create policy staff_all on internal_files for all using (is_staff()) with check (is_staff());

-- 4. People on the Dhow team, with or without a login.
create table if not exists team_people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  title text,
  department text,
  email text,
  phone text,
  photo_url text check (photo_url is null or photo_url ~* '^https://'),
  bio text check (char_length(bio) <= 1500),
  linkedin text,
  started_on date,
  active boolean not null default true,
  sort int not null default 100,
  created_at timestamptz not null default now()
);
alter table team_people enable row level security;
create policy staff_all on team_people for all using (is_staff()) with check (is_staff());

-- 5. Dhow Partners' own profile (one row).
create table if not exists dhow_profile (
  id int primary key default 1 check (id = 1),
  legal_name text not null default 'Dhow Partners',
  trading_name text,
  tagline text,
  about text,
  registration_no text,
  kra_pin text,
  vat_no text,
  founded_year int,
  address text,
  postal_address text,
  email text,
  phone text,
  whatsapp text,
  website text,
  booking_link text,
  logo_url text,
  bank_details text,
  socials jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into dhow_profile (id, legal_name, website, email) values (1, 'Dhow Partners', 'https://dhowpartners.com', 'hello@dhowpartners.com')
on conflict (id) do nothing;
alter table dhow_profile enable row level security;
create policy staff_read on dhow_profile for select using (is_staff());
create policy admin_write on dhow_profile for update using (has_staff_role(array['admin']::staff_role[])) with check (has_staff_role(array['admin']::staff_role[]));

-- 6. Storage: public images (logos, photos) and private internal files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-images', 'public-images', true, 3145728, array['image/png', 'image/jpeg', 'image/webp']),
       ('internal-files', 'internal-files', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;
