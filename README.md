# Dhow OS

**The operating system for [Dhow Partners](https://dhowpartners.com)**: one platform for the Dhow team, our member companies and our clients.

Live at **[workspace.dhowpartners.com](https://workspace.dhowpartners.com)** · Proprietary, © Dhow Partners Limited

---

## Contents

1. [What it does](#1-what-it-does)
2. [Architecture](#2-architecture)
3. [Project layout](#3-project-layout)
4. [Getting started](#4-getting-started)
5. [Configuration](#5-configuration)
6. [How the key flows work](#6-how-the-key-flows-work)
7. [Security](#7-security)
8. [Quality checks](#8-quality-checks)
9. [Deploying](#9-deploying)
10. [Working on the code](#10-working-on-the-code)

---

## 1. What it does

Dhow OS has three sides, each with its own entrance:

| Side | Who | Where | What they can do |
|---|---|---|---|
| **Workspace** | Dhow staff | `/admin` | Dashboard and alerts, clients, partners, projects and tasks with review, leads, finance (invoices, bills, payments, share calculator, exports), opportunities review, member companies, verification reviews, analytics, team and roles, ideas, calendar |
| **Member area** | Member companies | `/app` | Opportunities ranked for their company, events, applications, Dhow Verified, documents, member directory (opt-in), email choices |
| **Client page** | Clients | `/client/<private link>` | Project progress, invoices, online payment, reviews (no account needed) |

Partners use private links for document uploads (`/partner/<link>`) and client reviews (`/review/<link>`). Public pages: sign-in, sign-up, help centre, terms and privacy.

**Roles in the workspace**

| Role | Can |
|---|---|
| Director / owner (`admin`) | Everything, including deleting records and editing the company profile |
| Finance | Workspace + money (invoices, bills, payments, bank balance) |
| Reviewer | Workspace + verification reviews |
| Employee | Workspace without money; can't delete or change the company profile; finished tasks go to someone else for review |

## 2. Architecture

```
Browser ──► Next.js 15 on Vercel (App Router, server actions, edge middleware)
              │
              ├── Supabase: Postgres with Row Level Security, Auth, Storage (internal files, logos)
              ├── Cloudflare R2: member documents (presigned uploads)
              ├── Paystack / M-Pesa Daraja: verification fees, invoice payments
              ├── Dojah / Smile ID: business registry (KYB) checks
              ├── Resend: all email (alerts, reminders, receipts, auth emails via SMTP)
              ├── Africa's Talking: SMS
              ├── Google / Microsoft: staff calendars (read)
              └── Vercel Cron: daily jobs (imports, reminders, morning alerts, weekly fits)
```

Stack: Next.js 15, React 19, TypeScript, Tailwind CSS v4, Supabase, `@react-pdf/renderer` (PDFs), ExcelJS (spreadsheets), Zod (validation).

## 3. Project layout

```
src/
  app/
    (auth)/        sign in, sign up, forgot and reset password
    (site)/        help centre, terms, privacy
    admin/         staff workspace
    app/           member area
    client/        client page (private link)
    partner/       partner upload page (private link)
    review/        partner review page (private link)
    pay/           invoice payment page
    api/           payments, webhooks, exports, calendar feed, cron
  actions/         server actions (one file per area)
  components/      shared UI
  lib/             domain logic: auth, payments, invoices, matching, alerts, notify, storage…
  content/         help centre articles
supabase/
  migrations/      every schema change, in order
  templates/       branded auth email templates (paste into Supabase)
  tests/           database policy and finance tests
scripts/screenshots/  automated screenshots with demo data
```

## 4. Getting started

Requirements: Node 20+, a Supabase project, and `.env.local` filled from `.env.example`.

```bash
npm install
cp .env.example .env.local   # fill in at least the App and Supabase sections
npm run dev                  # http://localhost:3000
```

Database: apply `supabase/migrations/*.sql` in order (`supabase db push`, or the SQL editor), then make yourself the first admin:

```sql
update profiles set staff_role = 'admin'
where id = (select id from auth.users where email = 'you@dhowpartners.com');
```

## 5. Configuration

Every variable is listed, with comments, in [`.env.example`](.env.example). Integrations switch on when their keys are present; nothing breaks when one is missing.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Public address (`https://workspace.dhowpartners.com`); used in emails, payment returns and links |
| `DATA_ENCRYPTION_KEY` | AES-256 key for KRA PINs and tokens. **Never change it once set** |
| `MEMBER_APP_OPEN` | `1` opens the member area to the public; until then members see "Opening soon" (staff can preview) |
| `MEMBER_TESTERS` | Optional comma-separated emails allowed into the member area before launch |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email from `hello@dhowpartners.com` |
| `PAYSTACK_SECRET_KEY` | Payments; webhook `https://<domain>/api/payments/paystack` |
| `KYB_PROVIDER` + Dojah / Smile ID keys | Automatic business verification |
| `CRON_SECRET` | Protects the daily job |

**Auth emails** (confirm email, sign-in link, password reset) are sent through Resend: Supabase → Authentication → SMTP Settings → host `smtp.resend.com`, port `465`, user `resend`, password = Resend API key, sender `hello@dhowpartners.com`. Paste the templates from `supabase/templates/` into Supabase → Authentication → Emails.

## 6. How the key flows work

**Sign-up.** Name, email, password → confirm by link or 6-digit code → company name → workspace. Registration details are asked for only at verification. A welcome email follows.

**Verification.** Upload documents → pay the fee → automatic registry check. Clear matches are verified for 12 months; unclear ones go to a reviewer at no extra cost.

**Opportunities.** Imported daily from public sources, checked for whether Kenya can apply (`kenyaFit`), reviewed by staff, then published. Members see them ranked for their company by sector, chosen topics and types, location and deadline (`src/lib/matching.ts`, rule-based), and get a Monday email with new fits.

**Invoices.** Built in the workspace, sent as branded PDFs, paid by bank, paybill or online. Clients get reminders 3 days before, on the due date, then 3, 7 and 14 days late.

**Alerts.** Expiring licences, money due, late tasks, reviews and follow-ups appear on the Alerts page, in a 7am email and in each person's private calendar feed (`/api/calendar/feed/<token>.ics`).

**Daily job** (`/api/cron/daily`, 07:00 Nairobi): retire expired opportunities, import and check new ones, verification and payment upkeep, deadline and invoice reminders, morning alerts, and the Monday opportunities email.

## 7. Security

- Row Level Security on every table; members see only their own company; staff access depends on role.
- The service-role key is used only on the server, after an explicit permission check.
- KRA PINs and calendar tokens are encrypted (AES-256-GCM).
- Uploads are size- and type-checked, and their real bytes are inspected.
- Rate limits on sign-in, sign-up, codes, uploads, payments and private links.
- Strict security headers (CSP, HSTS, frame-deny) in `next.config.ts`.
- `robots.txt` lets search engines see only public pages.

See [SECURITY.md](SECURITY.md) to report a vulnerability.

## 8. Quality checks

Every push runs type-checking, linting and a production build (results on the `ci-results` branch). Screenshots of every main screen with demo data are produced on demand (`.github/screenshots-run`) and published to the `screenshots` branch.

```bash
npm run typecheck
npm run lint
npm run build
```

Database policy tests: see `supabase/tests/` (run on a throwaway database, never production).

## 9. Deploying

`main` deploys to production on Vercel automatically. Database changes go in a new file in `supabase/migrations/` and are applied before the code that needs them.

## 10. Working on the code

See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions, and [CHANGELOG.md](CHANGELOG.md) for what changed and when.
