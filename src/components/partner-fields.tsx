import { Field, Input, Select, Textarea } from "@/components/ui";
import { ImageInput, SocialFields } from "@/components/profile-bits";

export type PartnerRow = {
  id: string; name: string; industry: string | null; discipline: string | null; relationship: string; status: string; commission_terms: string | null;
  website: string | null; email: string | null; phone: string | null; address: string | null; notes: string | null; logo_url: string | null; socials: Record<string, string> | null;
  about?: string | null; agreed_pct?: number | null; services?: string[]; upload_token?: string | null; review_token?: string | null;
};

export function PartnerFields({ p, full }: { p?: PartnerRow; full?: boolean }) {
  return (
    <>
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      {full ? <div className="sm:col-span-2"><ImageInput current={p?.logo_url} name={p?.name ?? "Partner"} label="Logo" /></div> : null}
      <div className="sm:col-span-2"><Field label="Name"><Input name="name" required defaultValue={p?.name} /></Field></div>
      <Field label="Industry"><Input name="industry" list="partner-industries" placeholder="Legal, banking, logistics…" defaultValue={p?.industry ?? ""} /></Field>
      <Field label="Agreed percentage" hint="Their share or ours, per deal"><Input name="agreed_pct" type="number" min="0" max="100" step="any" inputMode="decimal" placeholder="e.g. 10" defaultValue={p?.agreed_pct ?? ""} /></Field>
      <div className="sm:col-span-2"><Field label="Work they can do" hint="Separate with commas"><Input name="services" placeholder="Company registration, Tax filing, Work permits" defaultValue={p?.services?.join(", ") ?? ""} /></Field></div>
      <datalist id="partner-industries">{["Legal", "Accounting and tax", "Banking and finance", "Immigration", "Real estate", "Logistics", "Technology", "Marketing", "HR and recruitment", "Insurance", "Government agency", "Chamber of commerce"].map((x) => <option key={x} value={x} />)}</datalist>
      <Field label="Relationship"><Select name="relationship" defaultValue={p?.relationship ?? "service"}><option value="service">Service partner</option><option value="referral">Referral partner</option><option value="institution">Institution</option></Select></Field>
      <Field label="Status"><Select name="status" defaultValue={p?.status ?? "vetting"}>{["vetting", "approved", "paused", "rejected"].map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}</Select></Field>
      <Field label="Email"><Input name="email" type="email" defaultValue={p?.email ?? ""} /></Field>
      <Field label="Phone"><Input name="phone" defaultValue={p?.phone ?? ""} /></Field>
      <div className="sm:col-span-2"><Field label="Website"><Input name="website" defaultValue={p?.website ?? ""} placeholder="https://" /></Field></div>
      {full ? (
        <>
          <div className="sm:col-span-2"><Field label="Company profile" hint="Who they are, how long, who they serve"><Textarea name="about" rows={4} maxLength={3000} defaultValue={p?.about ?? ""} /></Field></div>
          <div className="sm:col-span-2"><Field label="Main contact or focus"><Input name="discipline" placeholder="e.g. Jane Mwangi, Partner · company law" defaultValue={p?.discipline ?? ""} /></Field></div>
          <div className="sm:col-span-2"><Field label="Address"><Input name="address" defaultValue={p?.address ?? ""} /></Field></div>
          <div className="sm:col-span-2"><Field label="Agreement terms" hint="How the percentage works, payment timing"><Input name="commission_terms" placeholder="10% of fees on clients we refer, paid monthly" defaultValue={p?.commission_terms ?? ""} /></Field></div>
          <div className="sm:col-span-2"><Field label="Notes"><Textarea name="notes" rows={4} defaultValue={p?.notes ?? ""} /></Field></div>
          <div className="sm:col-span-2"><p className="mb-3 text-sm font-semibold">Social links</p><SocialFields value={p?.socials} /></div>
        </>
      ) : null}
    </>
  );
}
