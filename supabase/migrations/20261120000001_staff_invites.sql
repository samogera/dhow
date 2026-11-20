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
