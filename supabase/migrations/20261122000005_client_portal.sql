-- Private client page (no login): progress, invoices, paying, and a review of Dhow.
alter table clients add column if not exists portal_token text unique;
create table if not exists client_reviews (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete cascade,
  reviewer_name text not null check (char_length(reviewer_name) between 2 and 120),
  rating int not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  may_publish boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists client_reviews_client on client_reviews (client_id, created_at desc);
alter table client_reviews enable row level security;
create policy staff_all on client_reviews for all using (is_staff()) with check (is_staff());
