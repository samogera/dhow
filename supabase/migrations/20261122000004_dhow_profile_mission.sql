-- Mission, vision, promises, who we serve and services on the Dhow profile.
alter table dhow_profile add column if not exists mission text;
alter table dhow_profile add column if not exists vision text;
alter table dhow_profile add column if not exists promises text;
alter table dhow_profile add column if not exists audience text;
alter table dhow_profile add column if not exists services text;
