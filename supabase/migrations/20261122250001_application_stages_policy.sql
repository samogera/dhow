drop policy if exists apps_update_member on applications;
create policy apps_update_member on applications for update
  using (is_member(org_id) and status in ('interested','draft','started','submitted','withdrawn'))
  with check (is_member(org_id) and status in ('interested','draft','started','submitted','withdrawn'));
