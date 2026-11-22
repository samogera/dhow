-- Paid membership runs for a month or a year from payment. Members-only events.
alter table organizations add column if not exists plan_period text check (plan_period in ('monthly','yearly'));
alter table organizations add column if not exists plan_until date;
alter table opportunities add column if not exists members_only boolean not null default false;
