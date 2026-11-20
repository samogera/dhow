import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { CenteredShell } from "@/components/centered-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmPaystack, validInvoicePayToken } from "@/lib/payments";
import { day, kes } from "@/lib/format";
import { PayForm } from "./form";

export const metadata: Metadata = { title: "Pay invoice", robots: { index: false } };

export default async function PayInvoice({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; reference?: string }> }) {
  const { id } = await params;
  const { t = "", reference } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !validInvoicePayToken(id, t)) notFound();

  const result = reference ? await confirmPaystack(reference).catch(() => null) : null;
  const { data: inv } = await createAdminClient().from("invoices")
    .select("id, number, status, due_date, total_kes, paid_kes, clients(name, email)").eq("id", id).maybeSingle();
  if (!inv || inv.status === "draft") notFound();
  const client = inv.clients as unknown as { name: string; email: string | null } | null;
  const balance = Number(inv.total_kes) - Number(inv.paid_kes);

  return (
    <CenteredShell>
      <p className="label text-center">Invoice {inv.number}</p>
      <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight text-navy-900">{client?.name}</h1>

      {result && result.state !== "paid" ? (
        <p className={`mt-6 rounded-2xl px-4 py-3 text-sm ${result.state === "failed" ? "bg-bad/10 text-bad" : "bg-warn/10 text-warn"}`}>{result.message}</p>
      ) : null}

      {balance <= 0 || result?.state === "paid" ? (
        <div className="mt-8 text-center">
          <CheckCircle2 className="mx-auto size-12 text-green" />
          <p className="mt-4 text-lg font-semibold">Paid. Thank you.</p>
          <p className="mt-1 text-sm text-muted">{result?.receipt ? `Reference ${result.receipt}. ` : ""}Dhow Partners has been notified.</p>
        </div>
      ) : inv.status === "cancelled" ? (
        <p className="mt-8 text-center text-muted">This invoice was cancelled.</p>
      ) : (
        <>
          <dl className="mt-8 space-y-2 rounded-2xl bg-sunken p-5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Invoice total</dt><dd className="num">{kes(inv.total_kes)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Already paid</dt><dd className="num">{kes(inv.paid_kes)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Due</dt><dd>{day(inv.due_date)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Balance</dt><dd className="num">{kes(balance)}</dd></div>
          </dl>
          <div className="mt-6"><PayForm id={inv.id} t={t} email={client?.email ?? ""} amount={kes(balance)} /></div>
        </>
      )}
    </CenteredShell>
  );
}
