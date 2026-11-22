import { Field, Input, Select } from "@/components/ui";
import { BILL_CATEGORY_LABEL } from "@/lib/bills";

export type BillRow = { id: string; description: string; amount_kes: number; paid_kes: number; due_date: string | null; category: string; payee: string | null; repeats: string; partner_id?: string | null; project_id?: string | null };

/** Fields for a bill or an expense. Partner and project are optional: a BRS fee or an event ticket has neither. */
export function BillFields({ b, partners, projects }: { b?: BillRow; partners: { id: string; name: string }[]; projects: { id: string; name: string }[] }) {
  const paid = b ? Number(b.paid_kes) >= Number(b.amount_kes) : false;
  return (
    <>
      {b ? <input type="hidden" name="id" value={b.id} /> : null}
      <div className="sm:col-span-2"><Field label="What it's for"><Input name="description" required defaultValue={b?.description} placeholder="e.g. BRS annual return, KNCCI breakfast tickets, Office rent" /></Field></div>
      <Field label="Type"><Select name="category" defaultValue={b?.category ?? "other"}>{Object.entries(BILL_CATEGORY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
      <Field label="Paid to"><Input name="payee" list="payees" defaultValue={b?.payee ?? ""} placeholder="BRS, KRA, landlord, staff member…" /></Field>
      <Field label="Amount (KES)"><Input name="amount_kes" type="number" min="1" step="any" required defaultValue={b?.amount_kes ?? ""} /></Field>
      <Field label="Date due or spent"><Input name="due_date" type="date" defaultValue={b?.due_date ?? new Date().toISOString().slice(0, 10)} /></Field>
      <Field label="Repeats"><Select name="repeats" defaultValue={b?.repeats ?? "once"}><option value="once">Once</option><option value="monthly">Every month</option><option value="yearly">Every year</option></Select></Field>
      <Field label="Partner (if any)"><Select name="partner_id" defaultValue={b?.partner_id ?? ""}><option value="">None</option>{partners.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
      <div className="sm:col-span-2"><Field label="Project (if any)"><Select name="project_id" defaultValue={b?.project_id ?? ""}><option value="">None</option>{projects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field></div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="paid_now" defaultChecked={paid} className="size-4 accent-navy-900" />Already paid (record it as money spent)</label>
    </>
  );
}
