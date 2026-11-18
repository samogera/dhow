-- Sample data for screenshots only. Runs in a throwaway local Supabase inside GitHub Actions.
\set ON_ERROR_STOP 1
update profiles set staff_role = 'admin', full_name = 'Samuel Ogera' where id = (select id from auth.users where email = 'admin@dhow.test');
update profiles set full_name = 'Wanjiru Kamau', phone = '254712345678' where id = (select id from auth.users where email = 'member@dhow.test');

insert into organizations (id, name, sector, country, website, brs_number, kra_pin_last4, plan, verification_status, verified_at, verified_until, storage_used_bytes) values
 ('a0000000-0000-4000-8000-000000000001', 'Acacia Solar Ltd', 'Energy', 'Kenya', 'acaciasolar.co.ke', 'PVT-AB12CD3', '567X', 'starter', 'verified', now() - interval '20 days', now() + interval '345 days', 14680064),
 ('a0000000-0000-4000-8000-000000000002', 'Baraka Foods Ltd', 'Agriculture', 'Kenya', null, 'PVT-ZX98QW1', '221K', 'free', 'pending', null, null, 6291456),
 ('a0000000-0000-4000-8000-000000000003', 'Nile Freight EA', 'Trade', 'Uganda', null, null, null, 'free', 'unverified', null, null, 0),
 ('a0000000-0000-4000-8000-000000000004', 'Savanna Health Group', 'Health', 'Kenya', null, 'PVT-HH55RT0', '009Q', 'growth', 'verified', now() - interval '90 days', now() + interval '275 days', 220200960);

insert into memberships (org_id, user_id, role)
select 'a0000000-0000-4000-8000-000000000001', id, 'owner' from auth.users where email = 'member@dhow.test';

insert into documents (org_id, kind, file_name, object_key, mime_type, size_bytes, status, created_at) values
 ('a0000000-0000-4000-8000-000000000001', 'cr12', 'Acacia-CR12-2026.pdf', 'demo/a1/cr12.pdf', 'application/pdf', 412000, 'approved', now() - interval '21 days'),
 ('a0000000-0000-4000-8000-000000000001', 'kra_pin', 'KRA-PIN-certificate.pdf', 'demo/a1/kra.pdf', 'application/pdf', 188000, 'approved', now() - interval '21 days'),
 ('a0000000-0000-4000-8000-000000000001', 'tax_compliance', 'Tax-compliance-2026.pdf', 'demo/a1/tcc.pdf', 'application/pdf', 230000, 'uploaded', now() - interval '6 days'),
 ('a0000000-0000-4000-8000-000000000001', 'pitch_deck', 'Acacia-investor-deck.pdf', 'demo/a1/deck.pdf', 'application/pdf', 8900000, 'uploaded', now() - interval '2 days'),
 ('a0000000-0000-4000-8000-000000000002', 'certificate_of_incorporation', 'Baraka-certificate.pdf', 'demo/a2/cert.pdf', 'application/pdf', 350000, 'uploaded', now() - interval '1 day'),
 ('a0000000-0000-4000-8000-000000000002', 'kra_pin', 'Baraka-KRA-PIN.jpg', 'demo/a2/kra.jpg', 'image/jpeg', 920000, 'uploaded', now() - interval '1 day');

insert into verifications (id, org_id, tier, status, provider, provider_ref, result, created_at) values
 ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'instant', 'in_review', 'smile_id', 'job_8841', '{"reason": "Name on record is \"Baraka Foods Limited\"", "details": null}', now() - interval '3 hours');
insert into verifications (org_id, tier, status, provider, review_note, decided_at, created_at) values
 ('a0000000-0000-4000-8000-000000000001', 'manual', 'verified', 'manual', 'Documents match the registry record.', now() - interval '20 days', now() - interval '21 days');
insert into payments (org_id, purpose, reference_id, phone, amount_kes, checkout_request_id, mpesa_receipt, status, result_desc, paid_at, created_at) values
 ('a0000000-0000-4000-8000-000000000002', 'verification', 'b0000000-0000-4000-8000-000000000001', '254722000111', 500, 'ws_CO_demo1', 'TKQ7H2LM9P', 'paid', 'The service request is processed successfully.', now() - interval '3 hours', now() - interval '3 hours');

insert into opportunities (id, kind, title, summary, body, source, location, deadline, requires_verified, published) values
 ('c0000000-0000-4000-8000-000000000001', 'rfp', 'Solar mini-grid installation, Turkana', 'Design and install three 60 kW mini-grids for health centres.', E'## Scope\n\n- Site surveys at three health centres\n- Supply and install 60 kW solar mini-grids\n- Two years of maintenance\n\n## Who can apply\n\nDhow Verified energy companies registered in Kenya.', 'County Government of Turkana', 'Turkana', current_date + 12, true, true),
 ('c0000000-0000-4000-8000-000000000002', 'grant', 'Climate Innovation Grant 2027', 'Up to USD 50,000 for climate businesses in East Africa.', E'Grants for early-stage companies with a working product.', 'Development partner', 'East Africa', current_date + 30, true, true),
 ('c0000000-0000-4000-8000-000000000003', 'tender', 'Supply of laboratory equipment', 'Framework tender for county hospital laboratories.', '', 'Ministry of Health', 'Nairobi', current_date + 5, false, true);

insert into applications (org_id, opportunity_id, status, note, submitted_at) values
 ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'submitted', 'We have installed 14 mini-grids in Marsabit and Samburu since 2022.', now() - interval '2 days'),
 ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'shortlisted', 'Pay-as-you-go solar for smallholder farms.', now() - interval '12 days'),
 ('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000003', 'submitted', 'Framework supplier to two county hospitals.', now() - interval '1 day');

insert into leads (name, company, email, source, status, est_value_kes, next_step, next_step_date) values
 ('Company setup for a solar distributor', 'SunCo East Africa', 'ops@sunco.example', 'Website', 'new', 180000, 'First call', current_date + 1),
 ('Market entry: medical devices', 'Medline Europe', 'bd@medline.example', 'Partner firm', 'contacted', 1200000, 'Send capability note', current_date + 3),
 ('KRA and permits for a coffee exporter', 'Highland Beans', null, 'Referral', 'call_booked', 95000, 'Discovery call', current_date + 2),
 ('Partner introductions: fintech', 'Pesa Bridge', null, 'LinkedIn', 'contacted', 250000, 'Shortlist law firms', current_date - 1);

insert into projects (id, name, client_id, status, priority, start_date, due_date, fee_kes, description) values
 ('d0000000-0000-4000-8000-000000000001', 'Website and booking system', (select id from clients where name = 'Kivu Hospitality'), 'in_progress', 'high', current_date - 20, current_date + 25, 600000, 'Kivu Resort, Msafiri Rift Lodge, Kivu Tours.'),
 ('d0000000-0000-4000-8000-000000000002', 'Business system: Homecare, Travel, School', (select id from clients where name = 'Pals Group of Companies'), 'todo', 'high', current_date + 3, current_date + 60, 350000, null),
 ('d0000000-0000-4000-8000-000000000003', 'Website redesign', (select id from clients where name = 'Jamafriq Global Consultancy'), 'review', 'medium', current_date - 30, current_date + 4, 150000, null),
 ('d0000000-0000-4000-8000-000000000004', 'Domain and hosting move', (select id from clients where name = 'Dunia Endelevu'), 'done', 'low', current_date - 40, current_date - 10, 45000, null);

insert into tasks (title, project_id, status, priority, due_date, assignee) values
 ('Booking flow wireframes', 'd0000000-0000-4000-8000-000000000001', 'done', 'high', current_date - 5, (select id from auth.users where email = 'admin@dhow.test')),
 ('Room photos from the lodge', 'd0000000-0000-4000-8000-000000000001', 'todo', 'medium', current_date + 2, (select id from auth.users where email = 'admin@dhow.test')),
 ('Payment gateway test', 'd0000000-0000-4000-8000-000000000001', 'todo', 'high', current_date + 6, (select id from auth.users where email = 'admin@dhow.test')),
 ('Client sign-off on homepage', 'd0000000-0000-4000-8000-000000000003', 'todo', 'medium', current_date + 1, (select id from auth.users where email = 'admin@dhow.test')),
 ('Send proposal follow-up to Pals', null, 'todo', 'high', current_date, (select id from auth.users where email = 'admin@dhow.test'));

insert into invoices (id, client_id, project_id, issue_date, due_date, notes) values
 ('e0000000-0000-4000-8000-000000000001', (select id from clients where name = 'Kivu Hospitality'), 'd0000000-0000-4000-8000-000000000001', current_date - 10, current_date + 4, 'Payment by M-Pesa Paybill or I&M Bank transfer. Please quote the invoice number.'),
 ('e0000000-0000-4000-8000-000000000002', (select id from clients where name = 'Jamafriq Global Consultancy'), 'd0000000-0000-4000-8000-000000000003', current_date - 75, current_date - 61, null),
 ('e0000000-0000-4000-8000-000000000003', (select id from clients where name = 'Dunia Endelevu'), 'd0000000-0000-4000-8000-000000000004', current_date - 45, current_date - 31, null),
 ('e0000000-0000-4000-8000-000000000004', (select id from clients where name = 'GridFlow Solar'), null, current_date - 130, current_date - 116, null),
 ('e0000000-0000-4000-8000-000000000005', (select id from clients where name = 'Pals Group of Companies'), 'd0000000-0000-4000-8000-000000000002', current_date, current_date + 14, null);
insert into invoice_items (invoice_id, description, quantity, unit_price_kes, sort) values
 ('e0000000-0000-4000-8000-000000000001', 'Website design and build', 1, 400000, 0),
 ('e0000000-0000-4000-8000-000000000001', 'Booking system integration', 1, 200000, 1),
 ('e0000000-0000-4000-8000-000000000002', 'Website redesign', 1, 150000, 0),
 ('e0000000-0000-4000-8000-000000000003', 'Domain transfer and hosting setup', 1, 45000, 0),
 ('e0000000-0000-4000-8000-000000000004', 'Company setup with partner lawyers', 1, 120000, 0),
 ('e0000000-0000-4000-8000-000000000005', 'Discovery and system design', 1, 100000, 0);
update invoices set status = 'sent', sent_at = now() where id in ('e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000004');
insert into invoice_payments (invoice_id, amount_kes, method, reference, paid_on) values
 ('e0000000-0000-4000-8000-000000000001', 300000, 'M-Pesa', 'TKA91ZQ0', current_date - 3),
 ('e0000000-0000-4000-8000-000000000002', 174000, 'I&M Bank', 'IM-55120', current_date - 62),
 ('e0000000-0000-4000-8000-000000000004', 139200, 'M-Pesa', 'SJK11QQ7', current_date - 110),
 ('e0000000-0000-4000-8000-000000000003', 20000, 'M-Pesa', 'TB2200XX', current_date - 28);
update invoices set status = 'overdue' where id = 'e0000000-0000-4000-8000-000000000003';

insert into bills (description, partner_id, project_id, amount_kes, paid_kes, due_date) values
 ('Booking engine licence', (select id from partners where name = 'Binary One'), 'd0000000-0000-4000-8000-000000000001', 80000, 30000, current_date + 10),
 ('Legal review: company setup', null, null, 40000, 0, current_date + 5);
