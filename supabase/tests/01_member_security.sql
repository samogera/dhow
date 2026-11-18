\set ON_ERROR_STOP 1
-- two users, two orgs, one staff
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000001','a@x.com','{"full_name":"Alice"}'),
 ('00000000-0000-0000-0000-000000000002','b@x.com','{"full_name":"Bob"}'),
 ('00000000-0000-0000-0000-000000000003','s@dhow.com','{"full_name":"Staff"}');
update profiles set staff_role='finance' where id='00000000-0000-0000-0000-000000000003';
insert into organizations(id,name) values ('10000000-0000-0000-0000-000000000001','Acme'),('10000000-0000-0000-0000-000000000002','Beta');
insert into memberships values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','owner'),('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','owner');
insert into opportunities(id,kind,title,published,requires_verified) values ('20000000-0000-0000-0000-000000000001','grant','Grant A',true,true),('20000000-0000-0000-0000-000000000002','event','Open event',true,false);
insert into clients(id,name) values ('30000000-0000-0000-0000-000000000001','Kivu');
-- storage: 50MB cap free
select reserve_storage('10000000-0000-0000-0000-000000000001', 40*1024*1024) as r1, reserve_storage('10000000-0000-0000-0000-000000000001', 20*1024*1024) as r2_should_be_false;
-- invoice
insert into invoices(id,client_id,due_date) values ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001', current_date+7);
update invoices set status='sent' where id='40000000-0000-0000-0000-000000000001';
insert into invoice_items(invoice_id,description,quantity,unit_price_kes) values ('40000000-0000-0000-0000-000000000001','Website',1,100000),('40000000-0000-0000-0000-000000000001','Photos',2,10000);
insert into invoice_payments(invoice_id,amount_kes) values ('40000000-0000-0000-0000-000000000001',50000);
select number,subtotal_kes,vat_kes,total_kes,paid_kes,status from invoices;
select * from finance_position;

-- as Alice
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select 'alice sees orgs' t, count(*) from organizations;
select 'alice sees clients' t, count(*) from clients;
select 'alice sees invoices' t, count(*) from invoices;
update organizations set name='Acme Ltd' where id='10000000-0000-0000-0000-000000000001';
update organizations set name='Hacked' where id='10000000-0000-0000-0000-000000000002';
select name from organizations;
do $$ begin
  begin update organizations set verification_status='verified'; raise notice 'FAIL: could self-verify'; exception when insufficient_privilege then raise notice 'OK: cannot self-verify'; end;
  begin update profiles set staff_role='admin'; raise notice 'FAIL: could self-promote'; exception when insufficient_privilege then raise notice 'OK: cannot self-promote'; end;
  begin insert into applications(org_id,opportunity_id,status) values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','submitted'); raise notice 'FAIL: unverified applied to verified-only'; exception when insufficient_privilege then raise notice 'OK: verified-only grant blocked'; end;
  begin insert into applications(org_id,opportunity_id,status) values ('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','submitted'); raise notice 'FAIL: applied for other org'; exception when insufficient_privilege then raise notice 'OK: cannot apply for another org'; end;
  begin perform reserve_storage('10000000-0000-0000-0000-000000000001', 1); raise notice 'FAIL: can call reserve_storage'; exception when insufficient_privilege then raise notice 'OK: storage functions server-only'; end;
end $$;
insert into applications(org_id,opportunity_id,status) values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','submitted');
select 'alice apps' t, count(*) from applications;
-- as staff (finance)
reset role; set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select 'staff sees orgs' t, count(*) from organizations;
select 'staff sees invoices' t, count(*) from invoices;
select * from finance_position;
-- anon
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
select 'anon sees published opps' t, count(*) from opportunities;
select 'anon sees orgs' t, count(*) from organizations;
