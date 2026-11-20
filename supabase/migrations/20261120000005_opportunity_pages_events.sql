-- Full opportunity pages and events.
--   apply_url   the organiser's own application page (UN, foundation, programme site), found in the post or added by staff
--   about       a short description shown on the opportunity page
--   dhow_note   "Why it matters": a line from the Dhow team
--   starts_on / ends_on / venue   for events
--   featured    recommended by Dhow (shown first, with a badge)
alter table opportunities add column if not exists apply_url text check (apply_url is null or apply_url ~* '^https?://');
alter table opportunities add column if not exists about text not null default '';
alter table opportunities add column if not exists dhow_note text not null default '';
alter table opportunities add column if not exists starts_on date;
alter table opportunities add column if not exists ends_on date;
alter table opportunities add column if not exists venue text;
alter table opportunities add column if not exists featured boolean not null default false;
create index if not exists opportunities_events on opportunities (starts_on) where kind = 'event';

-- More sources for businesses.
insert into opportunity_sources (name, kind, url) values
  ('fundsforNGOs', 'rss', 'https://www2.fundsforngos.org/feed/'),
  ('Opportunities for Youth', 'wordpress', 'https://www.opportunitiesforyouth.org'),
  ('VC4A', 'rss', 'https://vc4a.com/feed/'),
  ('Grants.gov (Africa)', 'grants_gov', 'https://api.grants.gov/?keyword=Africa')
on conflict (url) do nothing;
