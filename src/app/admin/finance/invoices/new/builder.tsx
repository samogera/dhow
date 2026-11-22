"use client";
import { useActionState, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { createInvoice } from "@/actions/admin";
import { FormMessage, Submit } from "@/components/forms";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { InvoiceSheet, type SheetIssuer } from "@/components/invoice-sheet";
import { cn, kes } from "@/lib/format";

type Client = { id: string; name: string; email: string | null; country: string | null };
type Project = { id: string; name: string; client_id: string | null; fee_kes: number | null };
type Past = { description: string; unit_price_kes: number };
type Line = { description: string; quantity: string; unit_price_kes: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (from: string, n: number) => iso(new Date(new Date(from).getTime() + n * 864e5));
const chip = (on: boolean) => cn("rounded-full px-3 py-1.5 text-xs font-medium transition", on ? "bg-navy-900 text-white" : "bg-sunken text-ink/70 hover:text-ink");

export function InvoiceBuilder({ clients, projects, past, issuer, defaultClient }: { clients: Client[]; projects: Project[]; past: Past[]; issuer: SheetIssuer; defaultClient?: string }) {
  const [state, act] = useActionState(createInvoice, undefined);
  const [clientId, setClientId] = useState(defaultClient ?? "");
  const [newClient, setNewClient] = useState({ name: "", email: "", country: "Kenya" });
  const [projectId, setProjectId] = useState("");
  const [issue, setIssue] = useState(iso(new Date()));
  const [terms, setTerms] = useState(14);
  const [due, setDue] = useState(addDays(iso(new Date()), 14));
  const [vat, setVat] = useState("16");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: "1", unit_price_kes: "" }]);

  const isNew = clientId === "new";
  const client = isNew ? (newClient.name ? { name: newClient.name, email: newClient.email, country: newClient.country } : null) : clients.find((c) => c.id === clientId) ?? null;
  const clientProjects = projects.filter((p) => !clientId || isNew || p.client_id === clientId);
  const parsed = useMemo(() => lines.map((l) => ({ description: l.description.trim(), quantity: Number(l.quantity) || 0, unit_price_kes: Number(l.unit_price_kes) || 0 })), [lines]);
  const total = useMemo(() => { const sub = parsed.reduce((n, l) => n + l.quantity * l.unit_price_kes, 0); return sub + Math.round(sub * (Number(vat) || 0)) / 100; }, [parsed, vat]);
  const items = JSON.stringify(parsed.filter((l) => l.description));

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  function describe(i: number, value: string) {
    const hit = past.find((p) => p.description.toLowerCase() === value.trim().toLowerCase());
    setLine(i, { description: value, ...(hit && !lines[i].unit_price_kes ? { unit_price_kes: String(hit.unit_price_kes) } : {}) });
  }
  function pickTerms(n: number) { setTerms(n); setDue(addDays(issue, n)); }
  function pickProject(id: string) {
    setProjectId(id);
    const p = projects.find((x) => x.id === id);
    if (p?.client_id) setClientId(p.client_id);
    if (p?.fee_kes && lines.length === 1 && !lines[0].description) setLines([{ description: p.name, quantity: "1", unit_price_kes: String(p.fee_kes) }]);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form action={act} className="card space-y-7">
        <input type="hidden" name="items" value={items} />
        <input type="hidden" name="due_date" value={due} />

        <section className="space-y-3">
          <p className="text-sm font-semibold">1 · Who is it for?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Client">
              <Select name="client_id" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="" disabled>Choose a client</option>
                <option value="new">+ New client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Project (optional)">
              <Select name="project_id" value={projectId} onChange={(e) => pickProject(e.target.value)}>
                <option value="">None</option>
                {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
          </div>
          {isNew ? (
            <div className="grid gap-3 rounded-2xl bg-sunken/70 p-4 sm:grid-cols-3">
              <div className="sm:col-span-3"><Field label="Client name"><Input name="new_client_name" required value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="Company or person" /></Field></div>
              <div className="sm:col-span-2"><Field label="Email" hint="Where the invoice is sent"><Input name="new_client_email" type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} /></Field></div>
              <Field label="Country"><Input name="new_client_country" value={newClient.country} onChange={(e) => setNewClient({ ...newClient, country: e.target.value })} /></Field>
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold">2 · What are you charging for?</p>
          <datalist id="past-items">{past.map((p) => <option key={p.description} value={p.description} />)}</datalist>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_4rem_2.25rem] gap-2 rounded-2xl bg-sunken/50 p-2 sm:grid-cols-[1fr_4.5rem_8rem_2.25rem] sm:bg-transparent sm:p-0">
                <Input aria-label="Description" list="past-items" placeholder="e.g. Company registration" value={l.description} onChange={(e) => describe(i, e.target.value)} className="col-span-3 sm:col-span-1" />
                <Input aria-label="Quantity" type="number" min="0" step="any" inputMode="decimal" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                <Input aria-label="Price (KES)" type="number" min="0" step="any" inputMode="decimal" placeholder="Price, KES" value={l.unit_price_kes} onChange={(e) => setLine(i, { unit_price_kes: e.target.value })} />
                <button type="button" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                  className="grid size-9 place-items-center self-center rounded-full text-muted hover:bg-sunken disabled:opacity-30"><X className="size-4" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setLines((ls) => [...ls, { description: "", quantity: "1", unit_price_kes: "" }])}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-4 py-2 text-sm text-navy-700 hover:bg-sunken"><Plus className="size-4" />Add a line</button>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-sm text-muted">VAT</span>
            {["16", "0"].map((v) => <button key={v} type="button" onClick={() => setVat(v)} className={chip(vat === v)}>{v === "0" ? "No VAT" : `${v}%`}</button>)}
            <input name="vat_rate" type="number" min="0" max="100" step="any" value={vat} onChange={(e) => setVat(e.target.value)} aria-label="VAT %" className="field w-20 py-1.5 text-xs" />
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold">3 · When is it due?</p>
          <div className="flex flex-wrap gap-2">
            {[[0, "On receipt"], [7, "7 days"], [14, "14 days"], [30, "30 days"]].map(([n, l]) => (
              <button key={n} type="button" onClick={() => pickTerms(Number(n))} className={chip(terms === n)}>{l}</button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Issue date"><Input name="issue_date" type="date" required value={issue} onChange={(e) => { setIssue(e.target.value); setDue(addDays(e.target.value, terms)); }} /></Field>
            <Field label="Due date"><Input type="date" required value={due} onChange={(e) => { setDue(e.target.value); setTerms(-1); }} /></Field>
          </div>
        </section>

        <Field label="Note to the client (optional)" hint="Bank and M-Pesa details are added automatically">
          <Textarea name="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 50% deposit for the website project" />
        </Field>

        <FormMessage state={state} />
        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">Total <span className="num font-semibold text-ink">{kes(total)}</span> · saved as a draft, send it next.</p>
          <Submit pending="Creating…">Create invoice</Submit>
        </div>
      </form>

      <div className="xl:sticky xl:top-6 xl:self-start">
        <InvoiceSheet draft issuer={issuer} number={null} issue={issue} due={due} client={client} lines={parsed} vatRate={Number(vat) || 0} notes={notes} />
        {!issuer.bank.account_no && !issuer.paybill.number ? (
          <p className="mt-3 text-sm text-muted">Add your bank and Paybill details in <a href="/admin/company" className="text-navy-600 underline">Dhow profile</a> to show them on every invoice.</p>
        ) : null}
      </div>
    </div>
  );
}
