# Dhow OS

The operating system for Dhow Partners. It has two sides:

- **Member app** (`/app`) is for companies that join Dhow. They sign up, add company details, upload documents, get the *Dhow Verified* badge (free manual review, or a paid instant check through M-Pesa + KYB), and apply to RFPs, tenders, grants and events.
- **Dhow workspace** (`/admin`) is for the Dhow team. It covers verification reviews, member companies, the opportunities marketplace, leads → clients, partners, projects and tasks, finance (invoices, payments, partner bills, net position, PDF invoices sent by email), the wiki/SOPs, links and Google Calendar.

Stack: Next.js 15 (App Router, server actions), Supabase (Postgres, Auth, RLS), Cloudflare R2, M-Pesa Daraja, Smile ID, Resend, Africa's Talking, Inngest, Tailwind v4.

---

## 1. Run it locally

```bash
npm install
cp .env.example .env.local     # then fill it in (section 3)
npm run dev                    # http://localhost:3000
npm run typecheck && npm run lint
```

In a second terminal, run background jobs (optional locally, because payments fall back to running inline):

```bash
npm run inngest:dev
```

## 2. Supabase

1. Create a project at supabase.com (region: closest to Nairobi, e.g. `eu-west` or `af-south` when available).
2. **SQL editor:** run `supabase/migrations/20261118000001_init.sql`, then `supabase/seed.sql`.
   Or with the CLI: `supabase link --project-ref <ref> && supabase db push`, then run the seed.
3. **Auth → URL configuration:** set *Site URL* to your app URL and add `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`) to redirect URLs.
4. **Auth → Email:** turn on *Confirm email*. Under SMTP, point it at Resend so auth emails come from your domain.
5. Sign up in the app, then make yourself the first admin:
   ```sql
   update profiles set staff_role = 'admin'
   where id = (select id from auth.users where email = 'you@dhowpartners.com');
   ```
   After that you can give other people roles from **Staff and roles** in the workspace.

## 3. Environment variables

Every key is in `.env.example`. You need these to boot: `NEXT_PUBLIC_APP_URL`, `DATA_ENCRYPTION_KEY` (`openssl rand -base64 32`) and the three Supabase keys. Each integration below switches on when its keys are present.

| Service | What to set up |
|---|---|
| **Cloudflare R2** | Create the bucket `dhow-os-documents` and an API token with Object Read & Write on it. **CORS on the bucket:** allow `PUT` and `GET` from your app origin(s), allowed header `Content-Type`. Set `R2_PUBLIC_UPLOAD_ORIGIN` to `https://<account-id>.r2.cloudflarestorage.com`. Keep the bucket private. |
| **M-Pesa Daraja** | Create an app at developer.safaricom.co.ke and use the sandbox shortcode `174379` + passkey. Set `MPESA_CALLBACK_SECRET` to a long random string. The callback is `https://<domain>/api/payments/callback?key=…`, and the app builds it for you. For production you need your own Paybill/Till and go-live approval. |
| **Smile ID** | `KYB_PROVIDER=smile_id` plus your partner ID and API key. Leave it as `manual` until you sign the contract, and paid checks will then go to the review queue. **Confirm the business-verification request and response fields with Smile ID before going live** (see `src/lib/kyb.ts`). |
| **Resend** | Verify `dhowpartners.com` (SPF/DKIM DNS records) and set `RESEND_API_KEY` and `EMAIL_FROM`. |
| **Africa's Talking** | Use the sandbox first (`AT_USERNAME=sandbox`). For production, register a sender ID. |
| **Google Calendar** | In Google Cloud, create an OAuth client (Web), enable the Calendar API and add the redirect URI `https://<domain>/api/calendar/callback`. Scope: `calendar.readonly`. |
| **Inngest** | Create an app and set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`. After deploying, sync `https://<domain>/api/inngest`. Crons run at 02:00 (maintenance) and 08:00 (deadline reminders) Nairobi time. |

## 4. Deploy (Vercel)

1. Push to GitHub (`samogera/dhow-os`):
   ```bash
   git init && git add . && git commit -m "Dhow OS"
   gh repo create samogera/dhow-os --private --source . --push
   ```
2. Import the repo in Vercel, add the env vars and deploy.
3. Point `os.dhowpartners.com` (or similar) at Vercel and update `NEXT_PUBLIC_APP_URL`, the Supabase redirect URLs, R2 CORS and the Google redirect URI to match.

## 5. How the important parts work

**Security**
- Row Level Security is on for every table. Members only see their own company. Staff permissions depend on role: *reviewer* gets members, CRM, wiki and marketplace; *finance* adds money; *admin* gets everything.
- The service-role key is only used on the server, after an explicit permission check.
- Column-level grants mean members can't change their own plan, verification status or storage counters.
- KRA PINs and Google tokens are encrypted with AES-256-GCM.
- Sign-in, sign-up, uploads and payments are rate-limited in Postgres.
- Strict security headers (CSP, HSTS, frame-deny) are set in `next.config.ts`.

**Uploads**
1. The browser asks `/api/uploads/presign`. The server reserves quota (50 MB free / 500 MB verified) and returns a 5-minute URL locked to the exact size and type.
2. The file goes straight to R2.
3. `/api/uploads/complete` checks the size and the file's real bytes (PDF, PNG or JPG signatures), then commits the quota or rejects the file.
4. The nightly job clears abandoned uploads.

**Paid verification**
1. An STK push goes to the owner's phone.
2. Safaricom calls back with the secret key. The amount is checked and the payment is marked paid exactly once.
3. Inngest runs the KYB check. A match sets *Verified* for 12 months; anything unclear goes to **Verification reviews**.
4. Stuck payments are reconciled nightly with an STK query.

**Finance**
- Invoice totals, VAT (default 16%) and paid/part-paid status are calculated by database triggers.
- Net position = (received + owed by clients) − (paid out + owed to partners). It comes from the `finance_position` view.

## 6. Before going live

- **M-Pesa:** your own Paybill/Till and Daraja go-live.
- **KYB:** a signed Smile ID (or Peleza) contract, with field mapping confirmed.
- **Data protection:** register with the ODPC as a data controller/processor (you hold company and director data). Review `/privacy` and `/terms` with a lawyer.
- **Supabase:** turn on Point-in-Time Recovery (Pro plan) and 2FA on every admin account.
- **Testing:** test a full sandbox flow (sign up → upload → pay → verified → apply) before you announce.

## 7. Database tests

`supabase/tests/` checks row-level security, roles, storage caps and finance maths on a plain Postgres 16. Run them on a throwaway database, never on production:

```bash
createdb dhow_test
for f in supabase/tests/00_local_shim.sql supabase/migrations/*.sql supabase/seed.sql supabase/tests/01_*.sql supabase/tests/02_*.sql; do
  psql -d dhow_test -v ON_ERROR_STOP=1 -f "$f"; done
```

Every line printed as `NOTICE: OK: …` is a passed check. Any `FAIL` means a policy is broken.
