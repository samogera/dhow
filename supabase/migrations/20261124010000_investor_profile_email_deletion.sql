-- Investors can keep their own profile up to date, get emailed when a company asks for them, and ask to be deleted.
alter table investors add column if not exists email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
alter table investors add column if not exists deletion_requested_at timestamptz;
alter table investors add column if not exists updated_by_investor_at timestamptz;
