\set ON_ERROR_STOP 1
-- extra users: a reviewer and a finance person
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000004','r@dhow.com','{"full_name":"Rita Reviewer"}'),
 ('00000000-0000-0000-0000-000000000005','f@dhow.com','{"full_name":"Fred Finance"}');
update profiles set staff_role='reviewer' where id='00000000-0000-0000-0000-000000000004';
update profiles set staff_role='finance'  where id='00000000-0000-0000-0000-000000000005';

-- ================= REVIEWER: CRM, projects, wiki, links, marketplace
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select 'reviewer sees member orgs (members page)' t, count(*) from (select id,name,plan,verification_status,verified_until,storage_used_bytes from organizations) x;
insert into leads(id,name,company,status,est_value_kes,owner) values ('50000000-0000-0000-0000-000000000001','Solar distributor setup','SunCo','plan_sent',250000,auth.uid());
update leads set status='contacted' where id='50000000-0000-0000-0000-000000000001';
-- convertLead flow
with c as (insert into clients(name,stage,account_lead) values ('SunCo','onboarding',auth.uid()) returning id)
update leads set status='won', client_id=(select id from c) where id='50000000-0000-0000-0000-000000000001';
select 'lead converted' t, l.status, c.name from leads l join clients c on c.id=l.client_id where l.id='50000000-0000-0000-0000-000000000001';
insert into contacts(name,role,client_id) select 'Jane','CEO',id from clients where name='SunCo';
insert into partners(id,name,relationship,status) values ('60000000-0000-0000-0000-000000000001','Law Firm LLP','service','approved');
insert into projects(id,name,client_id,status,priority,owner) select '70000000-0000-0000-0000-000000000001','SunCo registration',id,'in_progress','high',auth.uid() from clients where name='SunCo';
insert into tasks(id,title,project_id,assignee) values ('71000000-0000-0000-0000-000000000001','File CR12','70000000-0000-0000-0000-000000000001',auth.uid());
update tasks set status='done', done_at=now() where id='71000000-0000-0000-0000-000000000001';
update projects set status='review' where id='70000000-0000-0000-0000-000000000001';
insert into wiki_pages(slug,title,section,body,updated_by) values ('onboarding-sop','Onboarding SOP','Operations','# Steps',auth.uid());
select 'wiki embed author' t, w.title, p.full_name from wiki_pages w left join profiles p on p.id=w.updated_by where slug='onboarding-sop';
insert into links(title,url,category) values ('KRA iTax','https://itax.kra.go.ke','Government');
insert into opportunities(id,kind,title,published,requires_verified,created_by) values ('20000000-0000-0000-0000-000000000009','rfp','New RFP',false,true,auth.uid());
update opportunities set published=true where id='20000000-0000-0000-0000-000000000009';
select 'reviewer sees submitted applications' t, count(*) from applications where status<>'draft';
do $$ begin
  begin insert into wiki_pages(slug,title) values ('onboarding-sop','Dup'); raise notice 'FAIL: duplicate slug'; exception when unique_violation then raise notice 'OK: duplicate wiki address -> 23505 (friendly message in app)'; end;
  begin insert into wiki_pages(slug,title) values ('Bad Slug!','x'); raise notice 'FAIL: bad slug'; exception when check_violation then raise notice 'OK: bad wiki address rejected'; end;
  begin insert into links(title,url) values ('x','javascript:alert(1)'); raise notice 'FAIL: js link'; exception when check_violation then raise notice 'OK: javascript: link rejected'; end;
  begin insert into invoices(client_id,due_date) select id, current_date from clients limit 1; raise notice 'FAIL: reviewer created invoice'; exception when insufficient_privilege then raise notice 'OK: reviewer cannot create invoices'; end;
  begin insert into bills(description,amount_kes) values ('x',1); raise notice 'FAIL: reviewer created bill'; exception when insufficient_privilege then raise notice 'OK: reviewer cannot create bills'; end;
  begin update profiles set staff_role='admin' where id=auth.uid(); raise notice 'FAIL: reviewer self-promoted'; exception when insufficient_privilege then raise notice 'OK: reviewer cannot self-promote'; end;
  begin update organizations set plan='growth'; raise notice 'FAIL: reviewer changed plan directly'; exception when insufficient_privilege then raise notice 'OK: plan changes only via server (admin)'; end;
end $$;
select 'reviewer sees invoices' t, count(*) from invoices;
select 'reviewer finance_position (should be zeros)' t, * from finance_position;

-- ================= FINANCE: invoice from the builder, payments, bills, net position
reset role; set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
insert into invoices(id,client_id,project_id,issue_date,due_date,vat_rate,notes,created_by)
 select '40000000-0000-0000-0000-000000000002', client_id, id, current_date, current_date+14, 16, 'Pay by M-Pesa', auth.uid() from projects where id='70000000-0000-0000-0000-000000000001';
insert into invoice_items(invoice_id,description,quantity,unit_price_kes,sort) values
 ('40000000-0000-0000-0000-000000000002','Company registration',1,150000,0),('40000000-0000-0000-0000-000000000002','KRA PIN + eTIMS',1,25000,1);
select 'new invoice (draft)' t, number,subtotal_kes,vat_kes,total_kes,status from invoices where id='40000000-0000-0000-0000-000000000002';
update invoices set status='sent', sent_at=now() where id='40000000-0000-0000-0000-000000000002';
insert into invoice_payments(invoice_id,amount_kes,method,reference,paid_on) values ('40000000-0000-0000-0000-000000000002',100000,'M-Pesa','QK7ABC',current_date);
select 'after part payment' t, paid_kes, status from invoices where id='40000000-0000-0000-0000-000000000002';
insert into invoice_payments(invoice_id,amount_kes,method) values ('40000000-0000-0000-0000-000000000002',103000,'I&M Bank');
select 'after full payment' t, paid_kes, status from invoices where id='40000000-0000-0000-0000-000000000002';
insert into bills(id,description,partner_id,project_id,amount_kes,due_date) values ('80000000-0000-0000-0000-000000000001','Legal review','60000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001',40000,current_date+10);
update bills set paid_kes=15000 where id='80000000-0000-0000-0000-000000000001';
select 'bill part paid' t, paid_kes, status from bills;
select 'finance_position' t, * from finance_position;
select 'net position' t, received_kes+owed_by_clients_kes-paid_out_kes-owed_to_partners_kes as net from finance_position;
-- cancel a fresh draft
insert into invoices(id,client_id,due_date) select '40000000-0000-0000-0000-000000000003',id,current_date+7 from clients where name='Kivu';
update invoices set status='cancelled' where id='40000000-0000-0000-0000-000000000003';
select 'cancelled excluded from owed' t, owed_by_clients_kes from finance_position;

-- ================= MEMBER cannot see any of the internal workspace
reset role; set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select 'member sees leads/clients/partners/projects/tasks/invoices/bills/wiki/links' t,
 (select count(*) from leads),(select count(*) from clients),(select count(*) from partners),(select count(*) from projects),
 (select count(*) from tasks),(select count(*) from invoices),(select count(*) from bills),(select count(*) from wiki_pages),(select count(*) from links);
select 'member finance_position' t, * from finance_position;
reset role;
select 'audit log rows' t, count(*) from audit_log;
