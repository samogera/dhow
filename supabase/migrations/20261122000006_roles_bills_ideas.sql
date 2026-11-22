-- Employees: can add and update, can't delete, change the Dhow profile or spend; their finished tasks are checked by someone else.
alter type staff_role add value if not exists 'employee';

-- Any kind of bill: rent, salaries, registrations, licences, partner bills.
alter table bills add column if not exists category text not null default 'partner'
  check (category in ('partner', 'rent', 'salary', 'registration', 'licence', 'tax', 'utilities', 'software', 'marketing', 'other'));
alter table bills add column if not exists payee text check (char_length(payee) <= 160);
alter table bills add column if not exists repeats text not null default 'once' check (repeats in ('once', 'monthly', 'yearly'));
alter table bills add column if not exists notes text check (char_length(notes) <= 1000);

-- Leads: notes on how the conversation is going.
alter table leads add column if not exists notes text check (char_length(notes) <= 4000);
alter table leads add column if not exists last_contact date;

-- Ideas from the team, with votes and comments.
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 200),
  details text check (char_length(details) <= 4000),
  status text not null default 'new' check (status in ('new', 'discussing', 'doing', 'done', 'parked')),
  author uuid references profiles,
  created_at timestamptz not null default now()
);
create table if not exists idea_votes (
  idea_id uuid not null references ideas on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  primary key (idea_id, user_id)
);
create table if not exists idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas on delete cascade,
  author uuid references profiles,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table ideas enable row level security;
alter table idea_votes enable row level security;
alter table idea_comments enable row level security;
create policy staff_all on ideas for all using (is_staff()) with check (is_staff());
create policy staff_all on idea_votes for all using (is_staff()) with check (is_staff());
create policy staff_all on idea_comments for all using (is_staff()) with check (is_staff());
