-- Starter data taken from the Dhow Partners Notion workspace.
-- Run once after the migration: supabase db reset (local) or paste into the SQL editor.

insert into partners (name, discipline, relationship, status, commission_terms, website, notes) values
  ('Binary One', 'Technology', 'referral', 'vetting', 'Managed IT: 15% of fees for the first 3 months. ERP: one-off 10%.', null, 'Sign the referral agreement, then approve.'),
  ('KenInvest (Kenya Investment Authority)', 'Government', 'institution', 'approved', null, 'https://www.invest.go.ke', 'Investor events and one-stop-centre guidance.'),
  ('KNCCI', 'Chamber', 'institution', 'approved', null, 'https://www.kenyachamber.or.ke', 'Chamber events and trade missions.'),
  ('British Chamber of Commerce Kenya', 'Chamber', 'institution', 'vetting', null, null, 'Network for foreign companies.'),
  ('African Private Capital Association (AVCA)', 'Investors', 'institution', 'vetting', null, null, 'Network for investors.');

insert into clients (name, sector, client_type, stage, country, notes) values
  ('Kivu Hospitality', 'Hospitality', 'Kenyan business', 'onboarding', 'Kenya', 'Kivu Resort, Msafiri Rift Lodge, Kivu Tours. Website and booking system, KES 600,000.'),
  ('Pals Group of Companies', 'Other', 'Kenyan business', 'active', 'Kenya', 'Nikko Homecare, Pals Travel & Leisure, Pals Academy.'),
  ('Jamafriq Global Consultancy', 'Education', 'Kenyan business', 'active', 'Kenya', 'Website redesign.'),
  ('Dunia Endelevu', 'Other', 'Kenyan business', 'active', 'Kenya', 'Website on its own domain.'),
  ('Ardena', null, 'Kenyan business', 'completed', 'Kenya', 'Company setup with partner lawyers.'),
  ('GridFlow Solar', 'Energy', 'Kenyan business', 'completed', 'Kenya', 'Setup and tech advice.');

insert into leads (name, company, status, est_value_kes, next_step, next_step_date, source)
values ('Business system for Homecare, Travel and School', 'Pals Group of Companies', 'plan_sent', 350000,
        'Follow up before the proposal expires on 23 Nov 2026.', '2026-11-20', 'Referral');

insert into opportunities (kind, title, summary, source, location, deadline, requires_verified, published) values
  ('event', 'Kenya Trade and Investment Roadshow 2026', 'Equity Group Holdings investors'' mission, 25 to 29 November 2026.', 'Equity Group', 'Nairobi', '2026-11-24', false, true),
  ('program', 'Dhow Partners Membership: round one', 'Applications open until 13 January 2027. Programme starts 18 January 2027.', 'Dhow Partners', 'Nairobi', '2027-01-13', false, true);

insert into wiki_pages (slug, title, section, body) values
  ('mission-vision-values', 'Mission, Vision, Values', 'Overview', E'# Mission, Vision, Values\n\nWrite the mission here.'),
  ('client-journey', 'Client journey', 'How we work', E'# Client journey\n\n1. Free first call (30 minutes)\n2. Written plan within 48 hours\n3. Coordination and weekly check-ins'),
  ('partner-vetting', 'Partner vetting', 'How we work', E'# Partner vetting\n\nFour checks before a firm gets client work: licence, references, past work, signed agreement.'),
  ('invoicing-and-payments', 'Invoicing and payments', 'Finance', E'# Invoicing and payments\n\nEvery invoice has a due date, a client and a project. Record each payment as it lands.');

insert into links (title, url, category) values
  ('Company website', 'https://dhowpartners.com', 'Brand'),
  ('Google Search Console', 'https://search.google.com/search-console', 'Marketing'),
  ('Notion workspace', 'https://app.notion.com', 'Tools');

-- Make yourself the first admin after signing up (replace the email):
-- update profiles set staff_role = 'admin' where id = (select id from auth.users where email = 'hello@dhowpartners.com');
