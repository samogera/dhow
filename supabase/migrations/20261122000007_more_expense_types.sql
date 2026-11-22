-- Track every shilling spent: events and exhibitions, travel, office, bank charges, alongside bills.
alter table bills drop constraint if exists bills_category_check;
alter table bills add constraint bills_category_check check (category in
  ('partner', 'rent', 'salary', 'registration', 'licence', 'tax', 'utilities', 'software', 'marketing', 'event', 'travel', 'office', 'bank', 'other'));
alter table bills add column if not exists paid_on date;
