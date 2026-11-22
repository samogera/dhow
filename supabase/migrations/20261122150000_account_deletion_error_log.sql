-- 1) Let members delete their own account.
-- Columns that point at a user (created_by, uploaded_by, owner, ...) become empty when that user is deleted,
-- instead of blocking the delete. Columns that already cascade are left alone.
do $$
declare r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl, a.attname as col, c.confrelid::regclass as ref
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.connamespace = 'public'::regnamespace
      and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
      and c.confdeltype in ('a', 'r')        -- no action / restrict
      and array_length(c.conkey, 1) = 1
      and not a.attnotnull
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references %s on delete set null', r.tbl, r.conname, r.col, r.ref);
  end loop;
end $$;

-- 2) Error log, so problems are visible after the hosting logs expire.
-- Written only by the server (service role). Read it in Supabase: Table editor -> app_errors.
create table if not exists app_errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  source text not null check (source in ('server', 'browser')),
  message text not null,
  digest text,
  path text,
  detail jsonb
);
create index if not exists app_errors_at on app_errors (at desc);
alter table app_errors enable row level security;
