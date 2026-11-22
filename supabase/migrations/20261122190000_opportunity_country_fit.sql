-- Whether an opportunity is open to companies and people in Kenya / East Africa.
--   open      names Kenya, East Africa, Africa, or is open worldwide
--   check     unclear: a person decides
--   excluded  limited to other countries; kept out of the review queue (can be restored)
alter table opportunities add column if not exists kenya_fit text check (kenya_fit in ('open', 'check', 'excluded'));
alter table opportunities add column if not exists fit_reason text;
create index if not exists opportunities_kenya_fit on opportunities (kenya_fit) where dismissed_at is null;
-- Everything imported is reviewed before it goes live.
update opportunity_sources set auto_publish = false;
