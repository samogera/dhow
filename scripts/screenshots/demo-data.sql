-- Demo data for the screenshot run only. Never run this on production.
-- Expects two users created through the Auth API: admin@dhow.test and owner@acacia.test.
\set ON_ERROR_STOP 1
update profiles set full_name = 'Samuel Ogera', staff_role = 'admin' where id = (select id from auth.users where email = 'admin@dhow.test');
update profiles set full_name = 'Wanjiru Kamau', phone = '254712345678' where id = (select id from auth.users where email = 'owner@acacia.test');

-- A verified member company with documents and applications
insert into organizations (id, name, country, sector, website, brs_number, kra_pin_last4, plan, verification_status, verified_at, verified_until, storage_used_bytes, created_by)
select 'a0000000-0000-4000-8000-000000000001', 'Acacia Solar Ltd', 'Kenya', 'Energy', 'acaciasolar.co.ke', 'PVT-AAB1234', '567X', 'free', 'verified', now() - interval '20 days', now() + interval '345 days', 3200000, id
from auth.users where email = 'owner@acacia.test';
insert into memberships (org_id, user_id, role) select 'a0000000-0000-4000-8000-000000000001', id, 'owner' from auth.users where email = 'owner@acacia.test';
insert into documents (org_id, uploaded_by, kind, file_name, object_key, mime_type, size_bytes, status)
select 'a0000000-0000-4000-8000-000000000001', u.id, k, f, 'demo/' || f, 'application/pdf', s, 'approved'
from auth.users u, (values ('cr12'::doc_kind, 'CR12 - Acacia Solar.pdf', 820000), ('certificate_of_incorporation', 'Certificate of incorporation.pdf', 1100000), ('kra_pin', 'KRA PIN certificate.pdf', 410000), ('pitch_deck', 'Acacia pitch deck 2026.pdf', 870000)) d(k, f, s)
where u.email = 'owner@acacia.test';
insert into verifications (org_id, tier, status, provider, review_note, decided_at, requested_by)
select 'a0000000-0000-4000-8000-000000000001', 'manual', 'verified', 'manual', 'Documents match registry records.', now() - interval '20 days', id from auth.users where email = 'owner@acacia.test';

-- Companies waiting for review
insert into organizations (id, name, sector, brs_number, verification_status, storage_used_bytes) values
  ('a0000000-0000-4000-8000-000000000002', 'Mara Agritech Ltd', 'Agriculture', 'PVT-XYZ9876', 'pending', 2400000),
  ('a0000000-0000-4000-8000-000000000003', 'Lamu Logistics Co.', 'Trade', 'PVT-LMU5521', 'pending', 1800000),
  ('a0000000-0000-4000-8000-000000000004', 'Kilele Health', 'Health', null, 'unverified', 0);
insert into verifications (org_id, tier, status, provider, result) values
  ('a0000000-0000-4000-8000-000000000002', 'instant', 'in_review', 'smile_id', '{"reason": "Name on record is \"Mara Agri-Tech Limited\""}'),
  ('a0000000-0000-4000-8000-000000000003', 'manual', 'pending', 'manual', null);
insert into documents (org_id, kind, file_name, object_key, mime_type, size_bytes, status) values
  ('a0000000-0000-4000-8000-000000000002', 'cr12', 'CR12.pdf', 'demo/mara-cr12.pdf', 'application/pdf', 900000, 'uploaded'),
  ('a0000000-0000-4000-8000-000000000002', 'kra_pin', 'KRA PIN.pdf', 'demo/mara-kra.pdf', 'application/pdf', 300000, 'uploaded'),
  ('a0000000-0000-4000-8000-000000000003', 'certificate_of_incorporation', 'Incorporation.pdf', 'demo/lamu-inc.pdf', 'application/pdf', 1200000, 'uploaded');

-- More opportunities and applications
insert into opportunities (id, kind, title, summary, body, source, location, deadline, requires_verified, published) values
  ('b0000000-0000-4000-8000-000000000001', 'rfp', 'Solar mini-grid installation, Kajiado County', 'Supply and install three 50 kW mini-grids for rural health centres.', E'## Scope\n\n- Design, supply and install three 50 kW solar mini-grids\n- Two years of maintenance\n\n## Who can apply\n\nDhow Verified companies with **solar installation experience** in Kenya.', 'County Government of Kajiado', 'Kajiado', current_date + 12, true, true),
  ('b0000000-0000-4000-8000-000000000002', 'grant', 'Climate innovation grant 2027', 'Grants of up to USD 50,000 for climate solutions in East Africa.', E'Early-stage companies with a working pilot.', 'Development partner', 'East Africa', current_date + 30, true, true),
  ('b0000000-0000-4000-8000-000000000003', 'tender', 'ICT equipment supply framework', 'Two-year framework for laptops and networking equipment.', '', 'Public agency', 'Nairobi', current_date + 6, false, true);
insert into applications (org_id, opportunity_id, status, note, submitted_by, submitted_at)
select 'a0000000-0000-4000-8000-000000000001', o, st::application_status, n, u.id, now() - interval '3 days'
from auth.users u, (values ('b0000000-0000-4000-8000-000000000001'::uuid, 'shortlisted', 'We installed 12 mini-grids in Narok in 2025.'), ('b0000000-0000-4000-8000-000000000002'::uuid, 'submitted', 'Pilot running in two schools.')) a(o, st, n)
where u.email = 'owner@acacia.test';

-- CRM, projects and finance
insert into leads (name, company, status, est_value_kes, next_step, next_step_date, source) values
  ('Company setup for a UK fintech', 'Ledgerline Ltd', 'new', 180000, 'Book a first call', current_date + 2, 'Website'),
  ('Market entry programme', 'Nordic Water AS', 'contacted', 1200000, 'Send capability deck', current_date + 1, 'Partner firm'),
  ('KRA and permits for a restaurant group', 'Swahili Plate', 'call_booked', 90000, 'Call on Thursday', current_date + 3, 'Referral');
insert into projects (id, name, client_id, status, priority, start_date, due_date, fee_kes)
select v.id::uuid, v.name, c.id, v.st::work_status, v.pr::priority, current_date - 10, current_date + v.d, v.fee
from (values
  ('c0000000-0000-4000-8000-000000000001', 'Kivu website and booking system', 'Kivu Hospitality', 'in_progress', 'high', 21, 600000),
  ('c0000000-0000-4000-8000-000000000002', 'Pals Group business system', 'Pals Group of Companies', 'todo', 'high', 45, 350000),
  ('c0000000-0000-4000-8000-000000000003', 'Jamafriq website redesign', 'Jamafriq Global Consultancy', 'review', 'medium', 5, 120000),
  ('c0000000-0000-4000-8000-000000000004', 'GridFlow company setup', 'GridFlow Solar', 'done', 'low', -5, 85000)
) v(id, name, client, st, pr, d, fee) join clients c on c.name = v.client;
insert into tasks (project_id, title, status, priority, due_date, assignee)
select p::uuid, t, s::work_status, 'medium', current_date + d, (select id from auth.users where email = 'admin@dhow.test')
from (values
  ('c0000000-0000-4000-8000-000000000001', 'Room types and rates from Kivu', 'done', -2),
  ('c0000000-0000-4000-8000-000000000001', 'Booking calendar integration', 'todo', 4),
  ('c0000000-0000-4000-8000-000000000001', 'Photo shoot at Msafiri Rift Lodge', 'todo', 7),
  ('c0000000-0000-4000-8000-000000000003', 'Client review of new homepage', 'todo', 1),
  ('c0000000-0000-4000-8000-000000000002', 'Send proposal follow-up', 'todo', 2)
) v(p, t, s, d);

insert into invoices (id, client_id, project_id, issue_date, due_date, status, notes)
select v.id::uuid, c.id, v.pid::uuid, current_date - v.age, current_date - v.age + 14, 'sent', 'Payment by M-Pesa Paybill or I&M Bank transfer.'
from (values
  ('d0000000-0000-4000-8000-000000000001', 'Kivu Hospitality', 'c0000000-0000-4000-8000-000000000001', 20),
  ('d0000000-0000-4000-8000-000000000002', 'Jamafriq Global Consultancy', 'c0000000-0000-4000-8000-000000000003', 40),
  ('d0000000-0000-4000-8000-000000000003', 'GridFlow Solar', 'c0000000-0000-4000-8000-000000000004', 70)
) v(id, client, pid, age) join clients c on c.name = v.client;
insert into invoice_items (invoice_id, description, quantity, unit_price_kes, sort) values
  ('d0000000-0000-4000-8000-000000000001', 'Website design and build, 50% deposit', 1, 300000, 0),
  ('d0000000-0000-4000-8000-000000000002', 'Website redesign', 1, 120000, 0),
  ('d0000000-0000-4000-8000-000000000003', 'Company registration and KRA PIN', 1, 65000, 0),
  ('d0000000-0000-4000-8000-000000000003', 'County business permit', 1, 20000, 1);
insert into invoice_payments (invoice_id, amount_kes, method, reference, paid_on) values
  ('d0000000-0000-4000-8000-000000000001', 150000, 'M-Pesa', 'QK7H2LMN4P', current_date - 15),
  ('d0000000-0000-4000-8000-000000000002', 139200, 'I&M Bank', 'IMB-55821', current_date - 32),
  ('d0000000-0000-4000-8000-000000000003', 98600, 'M-Pesa', 'QJ3K8RTY2W', current_date - 60);
insert into bills (description, partner_id, amount_kes, paid_kes, due_date)
select 'Referral commission: Kivu project', id, 45000, 15000, current_date + 10 from partners where name = 'Binary One';

-- Sample payment details for screenshots only (placeholders, not real accounts)
update dhow_profile set legal_name = 'Dhow Partners Limited', trading_name = 'Dhow Partners', address = 'Nairobi, Kenya',
  bank_name = 'Sample Bank', bank_account_name = 'Dhow Partners Limited', bank_account_no = '00000000000000',
  paybill = '000000', paybill_account = '00000000000000', invoice_terms = 'Please quote the invoice number when you pay.' where id = 1;
