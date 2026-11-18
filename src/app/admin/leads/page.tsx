import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Card, CardHeader, Field, Input, PageHeader, Select } from "@/components/ui";
import { day, kes, label } from "@/lib/format";
import { convertLead, saveLead, setLeadStatus } from "@/actions/admin";

export const metadata: Metadata = { title: "Leads" };
const STAGES = ["new", "contacted", "call_booked", "plan_sent", "won", "lost"] as const;

export default async function Leads() {
  const s = await requireStaff();
  const { data: leads } = await s.supabase.from("leads").select("*").order("next_step_date", { ascending: true, nullsFirst: false });
  const today = new Date().toISOString().slice(0, 10);
  const open = STAGES.slice(0, 4);

  return (
    <>
      <PageHeader title="Leads" sub="From first contact to a signed plan." />
      <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {open.map((stage) => {
          const items = (leads ?? []).filter((l) => l.status === stage);
          const total = items.reduce((sum, l) => sum + Number(l.est_value_kes ?? 0), 0);
          return (
            <section key={stage} className="w-72 shrink-0 rounded-[1.75rem] bg-white/60 p-3">
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
                    <div className="mt-3 flex flex-wrap gap-1">
                      <form action={setLeadStatus} className="flex gap-1">
                        <input type="hidden" name="id" value={l.id} />
                        <select name="status" defaultValue={l.status} className="rounded-full bg-sunken px-2 py-1 text-xs" aria-label="Stage">
                          {STAGES.map((st) => <option key={st} value={st}>{label(st)}</option>)}
                        </select>
                        <button className="text-xs text-navy-600 underline">Move</button>
                      </form>
                      <form action={convertLead}>
                        <input type="hidden" name="id" value={l.id} />
                        <button className="rounded-full bg-mint px-2.5 py-1 text-xs font-medium">Won → client</button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Add a lead" />
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
          </ActionForm>
        </Card>
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
