-- Outlook alongside Google: one connection per person per provider.
alter table calendar_connections add column if not exists provider text not null default 'google'
  check (provider in ('google', 'microsoft'));
alter table calendar_connections drop constraint if exists calendar_connections_pkey;
alter table calendar_connections add primary key (user_id, provider);

-- Business registry lookups in Kenya need the registered P.O. Box and postal code.
alter table organizations add column if not exists postal_address text check (postal_address ~ '^\d{1,6}$');
alter table organizations add column if not exists postal_code text check (postal_code ~ '^\d{5}$');

-- A Paystack payment can only ever be recorded once against an invoice.
create unique index if not exists invoice_payments_paystack_ref on invoice_payments (reference) where reference like 'PSK-%';
