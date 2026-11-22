import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Drawer } from "@/components/drawer";
import { Card, CardHeader, Field, Input, PageHeader, Select } from "@/components/ui";
import { day, kes, label } from "@/lib/format";
import { convertLead, importLeads, saveLead, setLeadStatus } from "@/actions/admin";
import { Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Leads" };
const STAGES = ["new", "contacted", "call_booked", "plan_sent", "won", "lost"] as const;

export default async function Leads() {
  const s = await requireStaff();
  const { data: leads } = await s.supabase.from("leads").select("*").order("next_step_date", { ascending: true, nullsFirst: false });
  const today = new Date().toISOString().slice(0, 10);
  const open = STAGES.slice(0, 4);

  return (
    <>
      <PageHeader title="Leads" sub="From first contact to a signed plan.">
        <div className="flex flex-wrap gap-2">
        <Drawer label="Upload a list" title="Upload people to talk to" sub="A CSV from Excel or Google Sheets, or paste rows. Columns: name, company, email, phone, notes." variant="outline">
          <ActionForm action={importLeads} submit="Add to leads" className="space-y-4">
            <input type="file" name="file" accept=".csv,text/csv,text/plain" className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white" />
            <Field label="Or paste here" hint="One person per line, values separated by commas"><Textarea name="rows" rows={6} placeholder={"Name, Company, Email, Phone, Notes\nJane Wanjiku, Acme Ltd, jane@acme.co.ke, 0712 345 678, Met at KNCCI breakfast"} /></Field>
            <Field label="Where the list came from"><Input name="source" placeholder="e.g. ACIS 2026 event" /></Field>
          </ActionForm>
        </Drawer>
        <Drawer label="New lead" title="New lead" sub="Only what they need is required. Fill in the rest later.">
          <ActionForm action={saveLead} submit="Add lead" className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="What they need"><Input name="name" required placeholder="Company setup for a solar distributor" /></Field></div>
            <Field label="Company"><Input name="company" /></Field>
            <Field label="Source"><Select name="source" defaultValue="Website">{["Website", "Referral", "LinkedIn", "Event", "WhatsApp", "Partner firm", "Directory", "Other"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Email"><Input name="email" type="email" /></Field>
            <Field label="Phone"><Input name="phone" /></Field>
            <Field label="Estimated value (KES)"><Input name="est_value_kes" type="number" min="0" step="1000" /></Field>
            <Field label="Stage"><Select name="status" defaultValue="new">{STAGES.map((st) => <option key={st} value={st}>{label(st)}</option>)}</Select></Field>
            <Field label="Next step"><Input name="next_step" /></Field>
            <Field label="Next step date"><Input name="next_step_date" type="date" /></Field>
            <div className="sm:col-span-2"><Field label="How it's going"><Textarea name="notes" rows={3} /></Field></div>
          </ActionForm>
        </Drawer>
        </div>
      </PageHeader>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-1">
        {open.map((stage) => {
          const items = (leads ?? []).filter((l) => l.status === stage);
          const total = items.reduce((sum, l) => sum + Number(l.est_value_kes ?? 0), 0);
          return (
            <section key={stage} className="w-[85vw] max-w-80 shrink-0 snap-start rounded-[1.75rem] sm:w-72 bg-white/60 p-3">
              <div className="mb-3 flex items-center justify-between px-2">
                <p className="text-sm font-semibold">{label(stage)} <span className="text-muted">{items.length}</span></p>
                <p className="num text-xs text-muted">{kes(total)}</p>
              </div>
              <div className="space-y-2">
                {items.map((l) => (
                  <article key={l.id} className="rounded-3xl bg-white p-4">
                    <p className="text-sm font-medium">{l.name}</p>
                    {l.company ? <p className="text-xs text-muted">{l.company}</p> : null}
                    {l.est_value_kes ? <p className="num mt-2 text-sm font-semibold">{kes(l.est_value_kes)}</p> : null}
                    {l.next_step ? <p className="mt-2 text-xs text-ink/70">{l.next_step}</p> : null}
                    {l.next_step_date ? <p className={l.next_step_date < today ? "mt-1 text-xs font-medium text-bad" : "mt-1 text-xs text-muted"}>Next: {day(l.next_step_date)}</p> : null}
                    {l.notes ? <p className="mt-2 line-clamp-3 rounded-xl bg-sunken/70 px-2.5 py-1.5 text-xs whitespace-pre-line text-ink/75">{l.notes}</p> : null}
                    {l.last_contact ? <p className="mt-1 text-[11px] text-faint">Last spoke {day(l.last_contact)}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-1">
                      <Drawer label="Update" title={l.company ?? l.name} sub="Notes on how it's going, and the next step" variant="outline" plus={false}>
                        <ActionForm action={saveLead} submit="Save" className="grid gap-3 sm:grid-cols-2">
                          <input type="hidden" name="id" value={l.id} />
                          <div className="sm:col-span-2"><Field label="What they need"><Input name="name" required defaultValue={l.name} /></Field></div>
                          <Field label="Company"><Input name="company" defaultValue={l.company ?? ""} /></Field>
                          <Field label="Source"><Input name="source" defaultValue={l.source ?? ""} /></Field>
                          <Field label="Email"><Input name="email" type="email" defaultValue={l.email ?? ""} /></Field>
                          <Field label="Phone"><Input name="phone" defaultValue={l.phone ?? ""} /></Field>
                          <Field label="Estimated value (KES)"><Input name="est_value_kes" type="number" min="0" step="1000" defaultValue={l.est_value_kes ?? ""} /></Field>
                          <Field label="Stage"><Select name="status" defaultValue={l.status}>{STAGES.map((st) => <option key={st} value={st}>{label(st)}</option>)}</Select></Field>
                          <Field label="Last spoke"><Input name="last_contact" type="date" defaultValue={l.last_contact ?? new Date().toISOString().slice(0, 10)} /></Field>
                          <Field label="Next step date"><Input name="next_step_date" type="date" defaultValue={l.next_step_date ?? ""} /></Field>
                          <div className="sm:col-span-2"><Field label="Next step"><Input name="next_step" defaultValue={l.next_step ?? ""} /></Field></div>
                          <div className="sm:col-span-2"><Field label="How it's going"><Textarea name="notes" rows={5} defaultValue={l.notes ?? ""} /></Field></div>
                        </ActionForm>
                      </Drawer>
                      <form action={setLeadStatus} className="flex gap-1">
                        <input type="hidden" name="id" value={l.id} />
                        <select name="status" defaultValue={l.status} className="rounded-full bg-sunken px-2 py-1 text-xs" aria-label="Stage">
                          {STAGES.map((st) => <option key={st} value={st}>{label(st)}</option>)}
                        </select>
                        <SubmitButton className="text-xs text-navy-600 underline">Move</SubmitButton>
                      </form>
                      <form action={convertLead}>
                        <input type="hidden" name="id" value={l.id} />
                        <SubmitButton className="rounded-full bg-mint px-2.5 py-1 text-xs font-medium">Won → client</SubmitButton>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader title="Closed" sub="Won and lost" />
          <ul className="divide-y divide-line text-sm">
            {(leads ?? []).filter((l) => l.status === "won" || l.status === "lost").map((l) => (
              <li key={l.id} className="flex justify-between py-3"><span>{l.company ?? l.name}</span><span className={l.status === "won" ? "text-good" : "text-muted"}>{label(l.status)}</span></li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
