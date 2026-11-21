-- Test data for trying Dhow OS and taking screenshots on the live project.
-- Every row uses an id starting with de5e…, so supabase/demo/remove-test-data.sql removes all of it.
-- Leaves real records (your clients, partners, invoices) alone. No invoices are added, so invoice numbers are not used up.

-- Member companies, joined over the last months, with full profiles
insert into organizations (id, name, country, sector, website, brs_number, kra_pin_last4, plan, verification_status, verified_at, verified_until, created_at, tagline, about, phone, email, address, founded_year, team_size, socials) values
 ('de5e0000-0000-4000-8000-000000000001','Acacia Solar Ltd','Kenya','Energy','https://acaciasolar.co.ke','PVT-AAB1234','567X','growth','verified', now()-interval '40 days', now()+interval '325 days', now()-interval '160 days',
  'Solar mini-grids for clinics and schools','Acacia designs, installs and maintains solar mini-grids for rural health centres and schools across the Rift Valley.','0712 345 678','hello@acaciasolar.co.ke','Ngong Road, Nairobi',2019,'21–50','{"linkedin":"https://www.linkedin.com/company/acacia-solar","x":"https://x.com/acaciasolar"}'),
 ('de5e0000-0000-4000-8000-000000000002','Mara Agritech Ltd','Kenya','Agriculture','https://maraagritech.com','PVT-XYZ9876','221K','starter','pending', null, null, now()-interval '120 days',
  'Cold storage for smallholder farmers','Solar-powered cold rooms and an ordering app that help farmers sell fresh produce for more.','0722 111 222','info@maraagritech.com','Narok Town',2021,'6–20','{"instagram":"https://www.instagram.com/maraagritech"}'),
 ('de5e0000-0000-4000-8000-000000000003','Lamu Logistics Co.','Kenya','Trade','https://lamulogistics.co.ke','PVT-LMU5521','908Q','free','pending', null, null, now()-interval '95 days',
  'Freight and clearing at Lamu and Mombasa','Customs clearing, warehousing and trucking for importers on the coast.','0733 444 555','ops@lamulogistics.co.ke','Lamu Port Road',2016,'21–50','{}'),
 ('de5e0000-0000-4000-8000-000000000004','Kilele Health','Kenya','Health',null,null,null,'free','unverified', null, null, now()-interval '60 days',
  'Home visits by registered nurses','Nurse home visits and remote check-ins for patients after discharge.','0700 222 333','care@kilelehealth.co.ke','Westlands, Nairobi',2023,'1–5','{}'),
 ('de5e0000-0000-4000-8000-000000000005','Pwani Crafts Collective','Kenya','Creative','https://pwanicrafts.co.ke','PVT-PWC4410','332M','starter','verified', now()-interval '12 days', now()+interval '353 days', now()-interval '35 days',
  'Handmade home goods from the coast','A collective of 40 artisans making baskets, textiles and furniture for export.','0711 909 808','sales@pwanicrafts.co.ke','Malindi',2018,'21–50','{"instagram":"https://www.instagram.com/pwanicrafts","facebook":"https://www.facebook.com/pwanicrafts"}'),
 ('de5e0000-0000-4000-8000-000000000006','Tana Water Systems','Kenya','Manufacturing','https://tanawater.co.ke','PVT-TWS7712','118B','free','unverified', null, null, now()-interval '6 days',
  'Water purification units for institutions','Locally assembled water treatment units for schools, hospitals and estates.','0799 123 456','hello@tanawater.co.ke','Thika',2020,'6–20','{"linkedin":"https://www.linkedin.com/company/tana-water"}'),
 ('de5e0000-0000-4000-8000-000000000007','Savanna Digital','Kenya','Technology','https://savannadigital.africa','PVT-SVD0021','451T','growth','verified', now()-interval '70 days', now()+interval '295 days', now()-interval '210 days',
  'Payment and booking software for hotels','Booking engine and M-Pesa payments for small hotels and lodges in East Africa.','0710 556 677','team@savannadigital.africa','Kilimani, Nairobi',2017,'21–50','{"linkedin":"https://www.linkedin.com/company/savanna-digital","x":"https://x.com/savannadigital"}')
on conflict (id) do nothing;

insert into verifications (id, org_id, tier, status, provider, result, review_note, decided_at, created_at) values
 ('de5e0000-0000-4000-8000-000000000101','de5e0000-0000-4000-8000-000000000001','manual','verified','manual',null,'Documents match registry records.', now()-interval '40 days', now()-interval '42 days'),
 ('de5e0000-0000-4000-8000-000000000102','de5e0000-0000-4000-8000-000000000002','instant','in_review','dojah','{"reason":"Name on record is \"Mara Agri-Tech Limited\""}',null,null, now()-interval '2 days'),
 ('de5e0000-0000-4000-8000-000000000103','de5e0000-0000-4000-8000-000000000003','manual','in_review','manual',null,null,null, now()-interval '1 day'),
 ('de5e0000-0000-4000-8000-000000000104','de5e0000-0000-4000-8000-000000000005','instant','verified','dojah',null,'Matched by dojah', now()-interval '12 days', now()-interval '12 days'),
 ('de5e0000-0000-4000-8000-000000000105','de5e0000-0000-4000-8000-000000000007','manual','verified','manual',null,'Documents match registry records.', now()-interval '70 days', now()-interval '72 days')
on conflict (id) do nothing;

-- Events (shown in the members' Events section)
insert into opportunities (id, kind, title, summary, about, dhow_note, source, location, venue, starts_on, ends_on, deadline, published, featured, benefits, eligibility, sectors, image_url) values
 ('de5e0000-0000-4000-8000-000000000201','event','East Africa Agribusiness Buyers Forum 2026','Two days of meetings between regional food buyers and Kenyan suppliers.',
  'Buyers from supermarkets, hotels and exporters meet pre-booked suppliers in short one-to-one meetings. Bring samples, prices and your company profile.',
  'A chance to meet buyers face to face and come away with orders to quote on.',
  null,'Kenya','KICC, Nairobi', current_date + 18, current_date + 19, current_date + 10, true, true,
  array['Pre-booked buyer meetings','Exhibition table','Networking dinner'], array['Registered Kenyan agribusinesses','Able to supply in volume'], array['Agriculture','Trade'], null),
 ('de5e0000-0000-4000-8000-000000000202','event','Export readiness clinic for SMEs','A half-day clinic on export paperwork, pricing and finding your first buyer.',
  'Practical sessions on certificates of origin, pricing for export, payment terms and how to answer a buyer''s first email.',
  '','Dhow Partners','Kenya','Dhow Partners office, Nairobi · and online', current_date + 9, null, current_date + 7, true, false,
  array['Export checklist','One-to-one advice slot'], array['Kenyan SMEs selling or planning to sell abroad'], array['Trade'], null),
 ('de5e0000-0000-4000-8000-000000000203','event','Women in Tech founders breakfast','A morning with founders, investors and programme managers.',
  'Short talks from founders who have raised their first round, then open networking.',
  '',null,'Kenya','Westlands, Nairobi', current_date + 26, null, null, true, false,
  array['Networking','Investor Q&A'], array['Women-led technology companies'], array['Technology'], null)
on conflict (id) do nothing;

-- Applications: which companies applied to which live opportunities
insert into applications (id, org_id, opportunity_id, status, note, submitted_at, created_at)
select ('de5e0000-0000-4000-8000-0000000003' || lpad(row_number() over ()::text, 2, '0'))::uuid, a.org::uuid, o.id, a.st::application_status, a.note, now() - (a.ago || ' days')::interval, now() - (a.ago || ' days')::interval
from (values
  (1,'de5e0000-0000-4000-8000-000000000001','shortlisted','We installed 12 mini-grids in Narok in 2025.',3),
  (2,'de5e0000-0000-4000-8000-000000000001','submitted','Strong fit for our school programme.',40),
  (1,'de5e0000-0000-4000-8000-000000000005','won','Export order secured after the buyer meeting.',75),
  (3,'de5e0000-0000-4000-8000-000000000005','submitted',null,10),
  (2,'de5e0000-0000-4000-8000-000000000007','submitted','Applying with our hotel payments pilot.',100),
  (4,'de5e0000-0000-4000-8000-000000000007','lost',null,130),
  (3,'de5e0000-0000-4000-8000-000000000002','submitted',null,20),
  (5,'de5e0000-0000-4000-8000-000000000003','submitted',null,55)
) a(n, org, st, note, ago)
join (select id, row_number() over (order by featured desc, created_at) n from opportunities where published and dismissed_at is null and id::text not like 'de5e%') o on o.n = a.n
on conflict do nothing;

-- Leads
insert into leads (id, name, company, email, status, est_value_kes, next_step, next_step_date, source) values
 ('de5e0000-0000-4000-8000-000000000401','Company setup for a UK fintech','Ledgerline Ltd','amy@ledgerline.co.uk','new',180000,'Book a first call', current_date + 2,'Website'),
 ('de5e0000-0000-4000-8000-000000000402','Market entry programme','Nordic Water AS','lars@nordicwater.no','contacted',1200000,'Send capability deck', current_date + 1,'Partner firm'),
 ('de5e0000-0000-4000-8000-000000000403','KRA and permits for a restaurant group','Swahili Plate','owner@swahiliplate.co.ke','call_booked',90000,'Call on Thursday', current_date + 3,'Referral'),
 ('de5e0000-0000-4000-8000-000000000404','Distributor search in Kenya','Andes Coffee SAS','ventas@andescoffee.co','plan_sent',650000,'Follow up on the plan', current_date - 1,'Event'),
 ('de5e0000-0000-4000-8000-000000000405','Work permits for three engineers','Helio Grid GmbH','hr@heliogrid.de','new',240000,'Request passports', current_date + 5,'Website')
on conflict (id) do nothing;

-- Projects and tasks (against your existing clients; removed with the rest)
insert into projects (id, name, client_id, status, priority, start_date, due_date, fee_kes)
select v.id::uuid, v.name, (select id from clients c where c.name = v.client order by created_at limit 1), v.st::work_status, v.pr::priority, current_date - 10, current_date + v.d, v.fee
from (values
  ('de5e0000-0000-4000-8000-000000000501','Demo: website and booking system','Kivu Hospitality','in_progress','high',21,600000),
  ('de5e0000-0000-4000-8000-000000000502','Demo: company setup','GridFlow Solar','review','medium',5,85000),
  ('de5e0000-0000-4000-8000-000000000503','Demo: website redesign','Jamafriq Global Consultancy','todo','medium',30,120000)
) v(id, name, client, st, pr, d, fee)
where exists (select 1 from clients c where c.name = v.client)
on conflict (id) do nothing;
insert into tasks (id, project_id, title, status, priority, due_date)
select v.id::uuid, v.p::uuid, v.t, v.s::work_status, 'medium', current_date + v.d
from (values
  ('de5e0000-0000-4000-8000-000000000601','de5e0000-0000-4000-8000-000000000501','Room types and rates from the client','done',-2),
  ('de5e0000-0000-4000-8000-000000000602','de5e0000-0000-4000-8000-000000000501','Booking calendar integration','todo',4),
  ('de5e0000-0000-4000-8000-000000000603','de5e0000-0000-4000-8000-000000000502','File CR12 request','in_progress',-1),
  ('de5e0000-0000-4000-8000-000000000604','de5e0000-0000-4000-8000-000000000503','Homepage design review','todo',2)
) v(id, p, t, s, d)
where exists (select 1 from projects where id = v.p::uuid)
on conflict (id) do nothing;

-- People on the team (no logins)
insert into team_people (id, full_name, title, department, email, phone, bio, started_on, sort) values
 ('de5e0000-0000-4000-8000-000000000701','Amina Odhiambo','Client Success Lead','Advisory','amina@example.com','0712 000 111','Looks after members from sign-up to their first deal.', current_date - 400, 10),
 ('de5e0000-0000-4000-8000-000000000702','Brian Mutua','Verification Analyst','Operations','brian@example.com','0722 000 222','Reviews company documents and registry results.', current_date - 200, 20),
 ('de5e0000-0000-4000-8000-000000000703','Faith Wanjiku','Partnerships Manager','Partnerships','faith@example.com',null,'Builds relationships with chambers, banks and investors.', current_date - 120, 30)
on conflict (id) do nothing;
