-- Member documents (CR12, KRA PIN and the rest) live in Supabase Storage unless Cloudflare R2 is configured.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-documents', 'member-documents', false, 10485760, array['application/pdf','image/png','image/jpeg'])
on conflict (id) do nothing;
