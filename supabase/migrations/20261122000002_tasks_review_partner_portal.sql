-- Tasks: notes, a reviewer, and the review outcome.
alter table tasks add column if not exists notes text check (char_length(notes) <= 2000);
alter table tasks add column if not exists reviewer uuid references profiles;
alter table tasks add column if not exists review_state text check (review_state in ('requested', 'approved', 'changes'));
alter table tasks add column if not exists review_note text check (char_length(review_note) <= 1000);
alter table tasks add column if not exists reviewed_by uuid references profiles;
alter table tasks add column if not exists reviewed_at timestamptz;
create index if not exists tasks_project on tasks (project_id);

-- Partners: what they do, the agreed percentage, and private links to upload documents and collect client reviews.
alter table partners add column if not exists services text[] not null default '{}';
alter table partners add column if not exists agreed_pct numeric(5,2) check (agreed_pct between 0 and 100);
alter table partners add column if not exists about text check (char_length(about) <= 3000);
alter table partners add column if not exists upload_token text unique;
alter table partners add column if not exists review_token text unique;

alter table internal_files add column if not exists uploaded_via text not null default 'staff' check (uploaded_via in ('staff', 'partner_link'));

-- Client reviews of partners (collected through the partner's review link, or added by staff).
create table if not exists partner_reviews (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners on delete cascade,
  reviewer_name text not null check (char_length(reviewer_name) between 2 and 120),
  reviewer_company text check (char_length(reviewer_company) <= 160),
  rating int not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  source text not null default 'link' check (source in ('link', 'staff')),
  created_at timestamptz not null default now()
);
create index if not exists partner_reviews_partner on partner_reviews (partner_id, created_at desc);
alter table partner_reviews enable row level security;
create policy staff_all on partner_reviews for all using (is_staff()) with check (is_staff());
