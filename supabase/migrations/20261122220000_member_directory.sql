-- Member directory is opt-in: a company appears only if it switches this on (and only once verified).
alter table organizations add column if not exists listed boolean not null default false;
alter table organizations add column if not exists listed_contact boolean not null default false;
