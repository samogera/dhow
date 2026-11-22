-- Private calendar subscription link per staff member, and their email preferences.
alter table profiles add column if not exists calendar_token text unique;
alter table profiles add column if not exists daily_digest boolean not null default true;
alter table profiles add column if not exists instant_emails boolean not null default true;
