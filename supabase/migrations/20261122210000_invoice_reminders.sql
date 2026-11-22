-- Payment reminders to clients: when the last one went, and a switch to stop them for one invoice.
alter table invoices add column if not exists last_reminder_on date;
alter table invoices add column if not exists reminders boolean not null default true;
