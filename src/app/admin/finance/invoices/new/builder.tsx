"use client";
import { useActionState, useMemo, useState } from "react";
import { createInvoice } from "@/actions/admin";
import { FormMessage, Submit } from "@/components/forms";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { day, kes } from "@/lib/format";

type Client = { id: string; name: string; email: string | null };
type Project = { id: string; name: string; client_id: string | null; fee_kes: number | null };
type Line = { description: string; quantity: string; unit_price_kes: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function InvoiceBuilder({ clients, projects, defaultClient }: { clients: Client[]; projects: Project[]; defaultClient?: string }) {
  const [state, act] = useActionState(createInvoice, undefined);
  const [clientId, setClientId] = useState(defaultClient ?? "");
  const [projectId, setProjectId] = useState("");
  const [issue, setIssue] = useState(iso(new Date()));
  const [due, setDue] = useState(iso(new Date(Date.now() + 14 * 864e5)));
  const [vat, setVat] = useState("16");
  const [notes, setNotes] = useState("Payment by M-Pesa Paybill or I&M Bank transfer. Please quote the invoice number.");
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: "1", unit_price_kes: "" }]);

  const client = clients.find((c) => c.id === clientId);
  const clientProjects = projects.filter((p) => !clientId || p.client_id === clientId);
  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price_kes) || 0), 0);
    const v = Math.round(subtotal * (Number(vat) || 0)) / 100;
    return { subtotal, vat: v, total: subtotal + v };
  }, [lines, vat]);

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const items = JSON.stringify(lines.filter((l) => l.description.trim()).map((l) => ({ description: l.description.trim(), quantity: Number(l.quantity) || 0, unit_price_kes: Number(l.unit_price_kes) || 0 })));

  function pickProject(id: string) {
    setProjectId(id);
    const p = projects.find((x) => x.id === id);
    if (p?.client_id) setClientId(p.client_id);
    if (p?.fee_kes && lines.length === 1 && !lines[0].description) setLines([{ description: p.name, quantity: "1", unit_price_kes: String(p.fee_kes) }]);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.05fr]">
      <form action={act} className="card space-y-5">
        <input type="hidden" name="items" value={items} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client">
            <Select name="client_id" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="" disabled>Choose a client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Project (optional)">
            <Select name="project_id" value={projectId} onChange={(e) => pickProject(e.target.value)}>
              <option value="">None</option>
              {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Issue date"><Input name="issue_date" type="date" required value={issue} onChange={(e) => setIssue(e.target.value)} /></Field>
          <Field label="Due date"><Input name="due_date" type="date" required value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>

        <div>
          <p className="label mb-2">Items</p>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_4.5rem_7.5rem_2rem] items-center gap-2">
                <Input aria-label="Description" placeholder="Service" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                <Input aria-label="Quantity" type="number" min="0" step="any" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                <Input aria-label="Unit price (KES)" type="number" min="0" step="any" placeholder="0" value={l.unit_price_kes} onChange={(e) => setLine(i, { unit_price_kes: e.target.value })} />
                <button type="button" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-full text-muted hover:bg-sunken disabled:opacity-30">×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setLines((ls) => [...ls, { description: "", quantity: "1", unit_price_kes: "" }])} className="mt-3 rounded-full border border-dashed border-line px-4 py-2 text-sm text-forest-700 hover:bg-sunken">+ Add item</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <Field label="VAT %"><Input name="vat_rate" type="number" min="0" max="100" step="any" value={vat} onChange={(e) => setVat(e.target.value)} /></Field>
          <Field label="Notes"><Textarea name="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </div>

        <FormMessage state={state} />
        <div className="flex items-center justify-between border-t border-line pt-4">
          <p className="text-sm text-muted">Saved as a draft. You can send it from the next screen.</p>
          <Submit pending="Creating…">Create invoice</Submit>
        </div>
      </form>

      {/* Live preview */}
      <div className="rounded-[2rem] bg-forest-900 p-3 xl:sticky xl:top-6 xl:self-start">
        <div className="flex items-center justify-between px-4 pb-3 pt-1 text-sm text-white/70">
          <span>Preview</span><span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-medium text-forest-900">Draft</span>
        </div>
        <article className="rounded-[1.5rem] bg-white p-8 text-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold tracking-tight">Dhow Partners</p>
              <p className="text-muted">Nairobi, Kenya · dhowpartners.com</p>
            </div>
            <div className="text-right">
              <p className="label">Invoice</p>
              <p className="text-muted">Issued {issue ? day(issue) : "—"}</p>
              <p className="text-muted">Due {due ? day(due) : "—"}</p>
            </div>
          </div>
          <div className="mt-8 rounded-2xl bg-sunken p-4">
            <p className="label">Billed to</p>
            <p className="mt-1 font-medium">{client?.name ?? "Choose a client"}</p>
            {client?.email ? <p className="text-muted">{client.email}</p> : null}
          </div>
          <table className="mt-6 w-full">
            <thead><tr className="text-left text-xs text-muted"><th className="pb-2 font-medium">Item</th><th className="pb-2 text-right font-medium">Qty</th><th className="pb-2 text-right font-medium">Price</th><th className="pb-2 text-right font-medium">Amount</th></tr></thead>
            <tbody className="divide-y divide-line">
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-2.5">{l.description || <span className="text-faint">Item {i + 1}</span>}</td>
                  <td className="num py-2.5 text-right">{l.quantity || 0}</td>
                  <td className="num py-2.5 text-right">{kes(Number(l.unit_price_kes) || 0)}</td>
                  <td className="num py-2.5 text-right">{kes((Number(l.quantity) || 0) * (Number(l.unit_price_kes) || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="ml-auto mt-6 w-64 space-y-1.5">
            <div className="flex justify-between text-muted"><dt>Subtotal</dt><dd className="num">{kes(totals.subtotal)}</dd></div>
            <div className="flex justify-between text-muted"><dt>VAT {vat || 0}%</dt><dd className="num">{kes(totals.vat)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd className="num">{kes(totals.total)}</dd></div>
          </dl>
          {notes ? <p className="mt-8 whitespace-pre-line text-xs text-muted">{notes}</p> : null}
        </article>
      </div>
    </div>
  );
}
