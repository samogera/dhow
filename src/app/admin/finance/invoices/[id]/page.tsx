import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { loadInvoice } from "@/lib/invoices";
import { ActionForm, ConfirmSubmit } from "@/components/forms";
import { ButtonAnchor, Card, CardHeader, Field, Input, Select, StatusBadge, Table } from "@/components/ui";
import { day, kes } from "@/lib/format";
import { cancelInvoice, recordPayment, sendInvoice } from "@/actions/admin";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await requireStaff(["finance"]);
  const inv = await loadInvoice(s.supabase, id);
  if (!inv) notFound();
  const { data: payments } = await s.supabase.from("invoice_payments").select("id, amount_kes, method, reference, paid_on").eq("invoice_id", id).order("paid_on");
  const balance = inv.total_kes - inv.paid_kes;
  const live = inv.status !== "cancelled";

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/finance" className="text-sm text-muted hover:text-ink">← Finance</Link>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight">Invoice #{inv.number} <StatusBadge status={inv.status} /></h1>
          <p className="mt-1 text-muted">{inv.client.name} · due {day(inv.due_date)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonAnchor variant="outline" href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener">Download PDF</ButtonAnchor>
          {live ? (
            <ActionForm action={sendInvoice} submit={inv.status === "draft" ? "Send to client" : "Send again"} className="flex items-center gap-2">
              <input type="hidden" name="id" value={inv.id} />
            </ActionForm>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Items" sub={inv.client.email ?? "No email on file for this client"} />
          <Table head={["Item", "Qty", "Price", "Amount"]}>
            {inv.items.map((it, i) => (
              <tr key={i}>
                <td>{it.description}</td>
                <td className="num">{it.quantity}</td>
                <td className="num">{kes(it.unit_price_kes)}</td>
                <td className="num">{kes(it.quantity * it.unit_price_kes)}</td>
              </tr>
            ))}
          </Table>
          <dl className="ml-auto mt-6 w-full max-w-72 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted"><dt>Subtotal</dt><dd className="num">{kes(inv.subtotal_kes)}</dd></div>
            <div className="flex justify-between text-muted"><dt>VAT {inv.vat_rate}%</dt><dd className="num">{kes(inv.vat_kes)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd className="num">{kes(inv.total_kes)}</dd></div>
            <div className="flex justify-between text-muted"><dt>Paid</dt><dd className="num">{kes(inv.paid_kes)}</dd></div>
            <div className="flex justify-between rounded-full bg-mint px-3 py-1.5 font-semibold"><dt>Balance</dt><dd className="num">{kes(balance)}</dd></div>
          </dl>
          {inv.notes ? <p className="mt-6 whitespace-pre-line text-sm text-muted">{inv.notes}</p> : null}
        </Card>

        <div className="space-y-4">
          {live && balance > 0 ? (
            <Card>
              <CardHeader title="Record a payment" />
              <ActionForm action={recordPayment} submit="Record payment">
                <input type="hidden" name="invoice_id" value={inv.id} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount (KES)"><Input name="amount_kes" type="number" min="1" step="any" defaultValue={balance} required /></Field>
                  <Field label="Date"><Input name="paid_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
                  <Field label="Method"><Select name="method" defaultValue="M-Pesa">{["M-Pesa", "I&M Bank", "Cash", "Other"].map((m) => <option key={m}>{m}</option>)}</Select></Field>
                  <Field label="Reference"><Input name="reference" placeholder="QK7…" /></Field>
                </div>
              </ActionForm>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Payments" />
            {payments?.length ? (
              <ul className="divide-y divide-line text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex justify-between py-3">
                    <span><span className="font-medium">{p.method}</span>{p.reference ? <span className="text-muted"> · {p.reference}</span> : null}<br /><span className="text-xs text-muted">{day(p.paid_on)}</span></span>
                    <span className="num font-medium">{kes(p.amount_kes)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No payments yet.</p>}
          </Card>

          {live && inv.paid_kes === 0 ? (
            <form action={cancelInvoice}>
              <input type="hidden" name="id" value={inv.id} />
              <ConfirmSubmit variant="danger" message={`Cancel invoice #${inv.number}? This can't be undone.`}>Cancel invoice</ConfirmSubmit>
            </form>
          ) : null}
        </div>
      </div>
    </>
  );
}
