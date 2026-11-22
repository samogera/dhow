-- Partners: a percentage per service (e.g. HR 360 15%, Recruitment 10%) and where the contract stands.
alter table public.partners
  add column if not exists service_rates jsonb not null default '[]'::jsonb,
  add column if not exists contract_status text not null default 'none',
  add column if not exists contract_date date,
  add column if not exists contract_notes text;

alter table public.partners drop constraint if exists partners_contract_status_check;
alter table public.partners add constraint partners_contract_status_check
  check (contract_status in ('none', 'discussed', 'sent', 'signed', 'ended'));

alter table public.partners drop constraint if exists partners_service_rates_array;
alter table public.partners add constraint partners_service_rates_array check (jsonb_typeof(service_rates) = 'array');

-- Existing services carry over with the partner's single agreed percentage.
update public.partners
set service_rates = coalesce((select jsonb_agg(jsonb_build_object('service', s, 'pct', agreed_pct)) from unnest(services) s), '[]'::jsonb)
where jsonb_array_length(service_rates) = 0 and coalesce(array_length(services, 1), 0) > 0;
