-- Payment details shown on every invoice (bank transfer and M-Pesa / Airtel paybill).
alter table dhow_profile add column if not exists bank_name text;
alter table dhow_profile add column if not exists bank_account_name text;
alter table dhow_profile add column if not exists bank_account_no text;
alter table dhow_profile add column if not exists bank_branch text;
alter table dhow_profile add column if not exists bank_swift text;
alter table dhow_profile add column if not exists paybill text;
alter table dhow_profile add column if not exists paybill_account text;
alter table dhow_profile add column if not exists invoice_terms text;
