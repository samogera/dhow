-- A profile photo for each person, shown in menus and on the team list.
alter table profiles add column if not exists avatar_url text check (avatar_url is null or avatar_url like 'https://%');
