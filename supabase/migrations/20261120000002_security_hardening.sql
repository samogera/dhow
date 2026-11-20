-- Hardening from the Supabase security advisor.

-- 1. Pin search_path on the remaining functions.
alter function storage_cap_bytes(plan_tier, verification_state) set search_path = public;
alter function trg_bill_status() set search_path = public;

-- 2. Invoice totals: the trigger runs with owner rights, so nobody needs to call recalc_invoice directly.
create or replace function trg_recalc_invoice() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform recalc_invoice(coalesce(new.invoice_id, old.invoice_id));
  return null;
end $$;
revoke execute on function recalc_invoice(uuid) from public, anon, authenticated;
revoke execute on function trg_recalc_invoice() from public, anon, authenticated;
revoke execute on function trg_audit() from public, anon, authenticated;

-- 3. Permission helpers: signed-out visitors never need them, except is_staff()
--    which the public opportunities policy uses (it only answers "is the caller staff?").
revoke execute on function is_member(uuid) from public, anon;
revoke execute on function is_org_admin(uuid) from public, anon;
revoke execute on function has_staff_role(staff_role[]) from public, anon;
revoke execute on function can_apply(uuid, uuid) from public, anon;
grant execute on function is_member(uuid), is_org_admin(uuid), has_staff_role(staff_role[]), can_apply(uuid, uuid) to authenticated;
