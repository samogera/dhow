import type { Metadata } from "next";
import { VerifiedTick } from "@/components/verified-tick";
import type { ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Card, CardHeader, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { Avatar, ImageInput, SocialFields, SocialLinks } from "@/components/profile-bits";
import { InternalFiles } from "@/components/internal-files";
import { saveDhowProfile } from "@/actions/profiles";

export const metadata: Metadata = { title: "Dhow profile" };

type D = {
  legal_name: string; trading_name: string | null; tagline: string | null; about: string | null; registration_no: string | null; kra_pin: string | null;
  vat_no: string | null; founded_year: number | null; address: string | null; postal_address: string | null; email: string | null; phone: string | null;
  whatsapp: string | null; website: string | null; booking_link: string | null; logo_url: string | null; bank_details: string | null; socials: Record<string, string> | null; updated_at: string;
  mission: string | null; vision: string | null; promises: string | null; audience: string | null; services: string | null;
  bank_name: string | null; bank_account_name: string | null; bank_account_no: string | null; bank_branch: string | null; bank_swift: string | null; paybill: string | null; paybill_account: string | null; invoice_terms: string | null;
};

function Block({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line pt-6 first-of-type:border-0 first-of-type:pt-0 lg:grid-cols-[13rem_1fr]">
      <div><h2 className="font-semibold text-navy-900">{title}</h2>{sub ? <p className="mt-1 text-sm text-muted">{sub}</p> : null}</div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
const W = ({ children }: { children: ReactNode }) => <div className="sm:col-span-2">{children}</div>;

export default async function Company() {
  const s = await requireStaff();
  const [{ data }, { data: files }] = await Promise.all([
    s.supabase.from("dhow_profile").select("*").eq("id", 1).maybeSingle(),
    s.supabase.from("internal_files").select("id, label, category, file_name, size_bytes, expires_on, created_at").eq("owner_type", "dhow").order("created_at", { ascending: false }),
  ]);
  const d = (data ?? { legal_name: "Dhow Partners" }) as D;
  const isAdmin = s.staffRole === "admin";

  return (
    <>
      <PageHeader title="Dhow profile" sub="Our own details, links and company documents, in one place for the team." />
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar src={d.logo_url} name={d.trading_name || d.legal_name} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">{d.trading_name || d.legal_name}<VerifiedTick size={20} /></h1>
            {d.tagline ? <p className="mt-1 text-muted">{d.tagline}</p> : null}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {d.email ? <a href={`mailto:${d.email}`} className="flex items-center gap-1.5 text-navy-600"><Mail className="size-4" />{d.email}</a> : null}
              {d.phone ? <a href={`tel:${d.phone}`} className="flex items-center gap-1.5 text-navy-600"><Phone className="size-4" />{d.phone}</a> : null}
              {d.address ? <span className="flex items-center gap-1.5 text-muted"><MapPin className="size-4" />{d.address}</span> : null}
            </div>
            <div className="mt-3"><SocialLinks website={d.website} socials={d.socials} /></div>
          </div>
          <div className="grid gap-1 text-sm sm:text-right">
            {d.booking_link ? <a href={d.booking_link} target="_blank" rel="noopener noreferrer" className="font-medium text-navy-600">Booking link ↗</a> : null}
            {d.registration_no ? <p><span className="text-muted">Reg. no.</span> <span className="font-medium">{d.registration_no}</span></p> : null}
            {d.kra_pin ? <p><span className="text-muted">KRA PIN</span> <span className="font-medium">{d.kra_pin}</span></p> : null}
            {d.vat_no ? <p><span className="text-muted">VAT</span> <span className="font-medium">{d.vat_no}</span></p> : null}
          </div>
        </div>
        {d.about ? <p className="mt-6 max-w-3xl whitespace-pre-line border-t border-line pt-6 text-[0.95rem] leading-relaxed text-ink/85">{d.about}</p> : null}
      </Card>

      {d.mission || d.vision || d.promises ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {d.mission ? <div className="card"><p className="label">Mission</p><p className="mt-2 text-[0.95rem] leading-relaxed">{d.mission}</p></div> : null}
          {d.vision ? <div className="card"><p className="label">Vision</p><p className="mt-2 text-[0.95rem] leading-relaxed">{d.vision}</p></div> : null}
          {d.audience ? <div className="card"><p className="label">Who we serve</p><p className="mt-2 text-[0.95rem] leading-relaxed">{d.audience}</p></div> : null}
          {d.promises ? (
            <div className="card lg:col-span-2">
              <p className="label">Our promises</p>
              <ol className="mt-3 space-y-3">{d.promises.split("\n").filter(Boolean).map((p, i) => <li key={i} className="flex gap-3 text-sm"><span className="num grid size-6 shrink-0 place-items-center rounded-full bg-navy-900 text-xs text-white">{i + 1}</span><span className="leading-relaxed">{p}</span></li>)}</ol>
            </div>
          ) : null}
          {d.services ? (
            <div className="card">
              <p className="label">Services</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">{d.services.split("\n").filter(Boolean).map((sv) => <li key={sv} className="rounded-full bg-sunken px-2.5 py-1 text-xs">{sv}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-6 sm:p-8">
          <CardHeader title="Edit details" sub={isAdmin ? undefined : "Only admins can change these."} />
          <ActionForm action={saveDhowProfile} submit="Save profile" className="space-y-8">
            <fieldset disabled={!isAdmin} className="contents">
              <Block title="Identity">
                <W><ImageInput current={d.logo_url} name={d.legal_name} label="Logo" /></W>
                <Field label="Legal name"><Input name="legal_name" required defaultValue={d.legal_name} /></Field>
                <Field label="Trading name"><Input name="trading_name" defaultValue={d.trading_name ?? ""} /></Field>
                <W><Field label="Tagline"><Input name="tagline" defaultValue={d.tagline ?? ""} /></Field></W>
                <W><Field label="About us"><Textarea name="about" rows={5} defaultValue={d.about ?? ""} /></Field></W>
                <Field label="Year founded"><Input name="founded_year" type="number" min={1900} max={2100} defaultValue={d.founded_year ?? ""} /></Field>
              </Block>
              <Block title="Mission and promises" sub="One point per line for promises and services">
                <W><Field label="Mission"><Textarea name="mission" rows={2} defaultValue={d.mission ?? ""} /></Field></W>
                <W><Field label="Vision"><Textarea name="vision" rows={2} defaultValue={d.vision ?? ""} /></Field></W>
                <W><Field label="Our promises"><Textarea name="promises" rows={4} defaultValue={d.promises ?? ""} /></Field></W>
                <W><Field label="Who we serve"><Textarea name="audience" rows={2} defaultValue={d.audience ?? ""} /></Field></W>
                <W><Field label="Services"><Textarea name="services" rows={6} defaultValue={d.services ?? ""} /></Field></W>
              </Block>
              <Block title="Registration and tax" sub="The KRA PIN shows on invoices">
                <Field label="Registration number"><Input name="registration_no" defaultValue={d.registration_no ?? ""} /></Field>
                <Field label="KRA PIN"><Input name="kra_pin" defaultValue={d.kra_pin ?? ""} /></Field>
                <Field label="VAT number"><Input name="vat_no" defaultValue={d.vat_no ?? ""} /></Field>
              </Block>
              <Block title="Getting paid" sub="Printed on every invoice and the online payment page">
                <Field label="Bank"><Input name="bank_name" defaultValue={d.bank_name ?? ""} placeholder="I&M Bank Kenya" /></Field>
                <Field label="Account name"><Input name="bank_account_name" defaultValue={d.bank_account_name ?? ""} /></Field>
                <Field label="Account number"><Input name="bank_account_no" inputMode="numeric" defaultValue={d.bank_account_no ?? ""} /></Field>
                <Field label="Branch"><Input name="bank_branch" defaultValue={d.bank_branch ?? ""} /></Field>
                <Field label="SWIFT code" hint="For payments from abroad"><Input name="bank_swift" defaultValue={d.bank_swift ?? ""} /></Field>
                <div />
                <Field label="M-Pesa / Airtel Paybill"><Input name="paybill" inputMode="numeric" defaultValue={d.paybill ?? ""} /></Field>
                <Field label="Paybill account number"><Input name="paybill_account" defaultValue={d.paybill_account ?? ""} /></Field>
                <W><Field label="Payment note" hint="Short line under the payment details"><Input name="invoice_terms" defaultValue={d.invoice_terms ?? ""} /></Field></W>
                <W><Field label="Other bank details" hint="Optional, for partners"><Textarea name="bank_details" rows={2} defaultValue={d.bank_details ?? ""} /></Field></W>
              </Block>
              <Block title="Contact">
                <Field label="Email"><Input name="email" type="email" defaultValue={d.email ?? ""} /></Field>
                <Field label="Phone"><Input name="phone" defaultValue={d.phone ?? ""} /></Field>
                <Field label="WhatsApp business number"><Input name="whatsapp" defaultValue={d.whatsapp ?? ""} /></Field>
                <Field label="Postal address"><Input name="postal_address" placeholder="P.O. Box 12345-00100" defaultValue={d.postal_address ?? ""} /></Field>
                <W><Field label="Office address"><Input name="address" defaultValue={d.address ?? ""} /></Field></W>
              </Block>
              <Block title="Links" sub="Website, booking link and social accounts">
                <Field label="Website"><Input name="website" defaultValue={d.website ?? ""} /></Field>
                <Field label="Booking link" hint="Calendly or similar"><Input name="booking_link" defaultValue={d.booking_link ?? ""} /></Field>
                <W><SocialFields value={d.socials} /></W>
              </Block>
            </fieldset>
          </ActionForm>
        </Card>
        <Card className="self-start">
          <CardHeader title="Company documents" sub="Certificate of incorporation, CR12, KRA PIN, tax compliance, company profile, licences." />
          <InternalFiles files={files ?? []} ownerType="dhow" />
        </Card>
      </div>
    </>
  );
}
