-- What a member company wants to hear about (used to rank opportunities, no AI), and each person's email choices.
alter table organizations add column if not exists interest_kinds text[] not null default '{}';
alter table organizations add column if not exists interest_sectors text[] not null default '{}';
alter table profiles add column if not exists email_prefs jsonb not null default '{"opportunities": true, "deadlines": true, "updates": true}'::jsonb;
