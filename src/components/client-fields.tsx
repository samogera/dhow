import { Field, Input, Select, Textarea } from "@/components/ui";
import { COUNTRIES, SECTORS } from "@/lib/types";

const STAGES = ["onboarding", "active", "on_hold", "completed", "lost"] as const;
export type ClientRow = { id: string; name: string; sector: string | null; client_type: string | null; stage: string; email: string | null; phone: string | null; website: string | null; country: string | null; notes: string | null };

export function ClientFields({ c }: { c?: ClientRow }) {
  return (
    <>
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <div className="sm:col-span-2"><Field label="Name"><Input name="name" required defaultValue={c?.name} /></Field></div>
      <Field label="Sector"><Select name="sector" defaultValue={c?.sector ?? ""}><option value="">—</option>{SECTORS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
      <Field label="Type"><Select name="client_type" defaultValue={c?.client_type ?? ""}><option value="">—</option>{["Foreign investor", "Local SME", "Startup", "NGO", "Government", "Individual"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
      <Field label="Email"><Input name="email" type="email" defaultValue={c?.email ?? ""} /></Field>
      <Field label="Phone"><Input name="phone" defaultValue={c?.phone ?? ""} /></Field>
      <Field label="Website"><Input name="website" defaultValue={c?.website ?? ""} /></Field>
      <Field label="Country"><Select name="country" defaultValue={c?.country ?? "Kenya"}>{COUNTRIES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
      <Field label="Stage"><Select name="stage" defaultValue={c?.stage ?? "onboarding"}>{STAGES.map((x) => <option key={x} value={x}>{x.replace("_", " ")}</option>)}</Select></Field>
      <div className="sm:col-span-2"><Field label="Notes"><Textarea name="notes" rows={3} defaultValue={c?.notes ?? ""} /></Field></div>
    </>
  );
}

