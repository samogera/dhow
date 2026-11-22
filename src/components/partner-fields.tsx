import { Field, Input, Select, Textarea } from "@/components/ui";
import { ImageInput, SocialFields } from "@/components/profile-bits";
import { ServiceRates, type Rate } from "@/components/service-rates";

export type PartnerRow = {
  id: string; name: string; industry: string | null; discipline: string | null; relationship: string; status: string; commission_terms: string | null;
  website: string | null; email: string | null; phone: string | null; address: string | null; notes: string | null; logo_url: string | null; socials: Record<string, string> | null;
  about?: string | null; agreed_pct?: number | null; services?: string[]; service_rates?: Rate[] | null; contract_status?: string; contract_date?: string | null; contract_notes?: string | null; upload_token?: string | null; review_token?: string | null;
};

export function PartnerFields({ p, full }: { p?: PartnerRow; full?: boolean }) {
  return (
    <>
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      {full ? <div className="sm:col-span-2"><ImageInput current={p?.logo_url} name={p?.name ?? "Partner"} label="Logo" /></div> : null}
      <div className="sm:col-span-2"><Field label="Name"><Input name="name" required defaultValue={p?.name} /></Field></div>
      <Field label="Industry"><Input name="industry" list="partner-industries" placeholder="Legal, banking, logistics…" defaultValue={p?.industry ?? ""} /></Field>
      <Field label="Default percentage" hint="Used when a service has no % of its own. Empty for chambers and government"><Input name="agreed_pct" type="number" min="0" max="100" step="any" inputMode="decimal" placeholder="e.g. 10" defaultValue={p?.agreed_pct ?? ""} /></Field>
      <div className="sm:col-span-2">
        <p className="mb-1 text-sm font-medium">Services and their percentage</p>
        <p className="mb-2.5 text-xs text-muted">One row per service, e.g. HR 360 at 15%, Recruitment at 10%. For chambers and government, list what we need them for and leave the % empty.</p>
        <ServiceRates value={p?.service_rates ?? (p?.services ?? []).map((sv) => ({ service: sv, pct: p?.agreed_pct ?? null }))} />
      </div>
      <datalist id="partner-industries">{["Legal", "Accounting and tax", "Banking and finance", "Immigration", "Real estate", "Logistics", "Technology", "Marketing", "HR and recruitment", "Insurance", "Government agency", "Chamber of commerce"].map((x) => <option key={x} value={x} />)}</datalist>
      <Field label="Relationship"><Select name="relationship" defaultValue={p?.relationship ?? "service"}><option value="service">Service partner</option><option value="referral">Referral partner</option><option value="institution">Chamber or government</option></Select></Field>
      <Field label="Status"><Select name="status" defaultValue={p?.status ?? "vetting"}><option value="vetting">Checking them</option><option value="approved">Verified (approved)</option><option value="paused">Paused</option><option value="rejected">Not working with them</option></Select></Field>
      <Field label="Email"><Input name="email" type="email" defaultValue={p?.email ?? ""} /></Field>
      <Field label="Phone"><Input name="phone" defaultValue={p?.phone ?? ""} /></Field>
      <div className="sm:col-span-2"><Field label="Website"><Input name="website" defaultValue={p?.website ?? ""} placeholder="https://" /></Field></div>
      {full ? (
        <>
          <div className="sm:col-span-2"><Field label="Company profile" hint="Who they are, how long, who they serve"><Textarea name="about" rows={4} maxLength={3000} defaultValue={p?.about ?? ""} /></Field></div>
          <div className="sm:col-span-2"><Field label="Main contact or focus"><Input name="discipline" placeholder="e.g. Jane Mwangi, Partner · company law" defaultValue={p?.discipline ?? ""} /></Field></div>
          <div className="sm:col-span-2"><Field label="Address"><Input name="address" defaultValue={p?.address ?? ""} /></Field></div>
          <Field label="Contract"><Select name="contract_status" defaultValue={p?.contract_status ?? "none"}>{Object.entries(CONTRACT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field label="Contract date" hint="When it was signed, sent or discussed"><Input name="contract_date" type="date" defaultValue={p?.contract_date ?? ""} /></Field>
          <div className="sm:col-span-2"><Field label="Contract notes" hint="What was agreed or still open"><Textarea name="contract_notes" rows={3} maxLength={3000} placeholder="Discussed terms in March. Waiting for our first client before signing." defaultValue={p?.contract_notes ?? ""} /></Field></div>
          <div className="sm:col-span-2"><Field label="Agreement terms" hint="How the percentage works, payment timing"><Textarea name="commission_terms" rows={3} maxLength={3000} placeholder="10% of fees on clients we refer, paid monthly" defaultValue={p?.commission_terms ?? ""} /></Field></div>
          <div className="sm:col-span-2"><Field label="Notes"><Textarea name="notes" rows={4} defaultValue={p?.notes ?? ""} /></Field></div>
          <div className="sm:col-span-2"><p className="mb-3 text-sm font-semibold">Social links</p><SocialFields value={p?.socials} /></div>
        </>
      ) : null}
    </>
  );
}

export const CONTRACT_LABEL: Record<string, string> = {
  none: "No contract yet",
  discussed: "Discussed, not signed",
  sent: "Sent for signing",
  signed: "Signed",
  ended: "Ended",
};
export const CONTRACT_TONE: Record<string, string> = {
  none: "bg-sunken text-muted",
  discussed: "bg-amber-100 text-amber-800",
  sent: "bg-navy-100 text-navy-700",
  signed: "bg-mint-100 text-green",
  ended: "bg-sunken text-faint",
};
