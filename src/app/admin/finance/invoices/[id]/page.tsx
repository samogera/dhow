import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { loadInvoice } from "@/lib/invoices";
import { loadIssuer } from "@/lib/dhow-profile";
import { InvoiceSheet } from "@/components/invoice-sheet";
import { ActionForm, ConfirmSubmit } from "@/components/forms";
import { ButtonAnchor, Card, CardHeader, Field, Input, Select, StatusBadge } from "@/components/ui";
import { day, kes } from "@/lib/format";
import { cancelInvoice, deleteInvoice, recordPayment, sendInvoice } from "@/actions/admin";
import { paystackConfigured } from "@/lib/paystack";
import { invoicePayUrl } from "@/lib/payments";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await requireStaff(["finance"]);
  const inv = await loadInvoice(s.supabase, id);
  if (!inv) notFound();
  const issuer = await loadIssuer();
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
          {live ? <ButtonAnchor variant="outline" href={`/admin/finance/invoices/${inv.id}/edit`}>Edit</ButtonAnchor> : null}
          <ButtonAnchor variant="outline" href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener">Download PDF</ButtonAnchor>
          {live ? (
            <ActionForm action={sendInvoice} submit={inv.status === "draft" ? "Send to client" : "Send again"} className="flex items-center gap-2">
              <input type="hidden" name="id" value={inv.id} />
            </ActionForm>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <InvoiceSheet issuer={issuer} number={inv.number} issue={inv.issue_date} due={inv.due_date} client={inv.client} lines={inv.items} vatRate={inv.vat_rate} paid={inv.paid_kes} notes={inv.notes} />

        <div className="space-y-4">
          {live && balance > 0 ? (
            <Card>
              <CardHeader title="Record a payment" />
              <ActionForm action={recordPayment} submit="Record payment">
                <input type="hidden" name="invoice_id" value={inv.id} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount (KES)"><Input name="amount_kes" type="number" min="1" step="any" defaultValue={balance} required /></Field>
                  <Field label="Date"><Input name="paid_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
                  <Field label="Method"><Select name="method" defaultValue="M-Pesa">{["M-Pesa", "I&M Bank", "Airtel Money", "Cash", "Other"].map((m) => <option key={m}>{m}</option>)}</Select></Field>
                  <Field label="Reference"><Input name="reference" placeholder="QK7…" /></Field>
                </div>
              </ActionForm>
            </Card>
          ) : null}

          {live && balance > 0 && inv.status !== "draft" && paystackConfigured() ? (
            <Card>
              <CardHeader title="Online payment link" sub="M-Pesa or card through Paystack. Payments are recorded here automatically." />
              <input readOnly value={invoicePayUrl(inv.id)} aria-label="Payment link" className="field text-xs" />
              <p className="mt-2 text-xs text-muted">This link is included in the invoice email. You can also send it on WhatsApp.</p>
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

          {inv.paid_kes === 0 ? (
            <form action={deleteInvoice}>
              <input type="hidden" name="id" value={inv.id} />
              <ConfirmSubmit variant="danger" message={`Delete invoice ${inv.number} completely? Use this for invoices made by mistake.`}>Delete invoice</ConfirmSubmit>
            </form>
          ) : null}
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
