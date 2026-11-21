-- Removes everything added by supabase/demo/test-data.sql (ids starting with de5e…). Nothing else is touched.
delete from applications where id::text like 'de5e%' or org_id::text like 'de5e%' or opportunity_id::text like 'de5e%';
delete from tasks where id::text like 'de5e%' or project_id::text like 'de5e%';
delete from projects where id::text like 'de5e%';
delete from leads where id::text like 'de5e%';
delete from team_people where id::text like 'de5e%';
delete from opportunities where id::text like 'de5e%';
delete from verifications where id::text like 'de5e%' or org_id::text like 'de5e%';
delete from organizations where id::text like 'de5e%';
