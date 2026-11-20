import type { Metadata } from "next";
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
            <h1 className="text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">{d.trading_name || d.legal_name}</h1>
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
              <Block title="Registration and tax">
                <Field label="Registration number"><Input name="registration_no" defaultValue={d.registration_no ?? ""} /></Field>
                <Field label="KRA PIN"><Input name="kra_pin" defaultValue={d.kra_pin ?? ""} /></Field>
                <Field label="VAT number"><Input name="vat_no" defaultValue={d.vat_no ?? ""} /></Field>
                <W><Field label="Bank details" hint="For invoices and partner payments"><Textarea name="bank_details" rows={3} defaultValue={d.bank_details ?? ""} /></Field></W>
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
