import Link from "next/link";
import { CheckCircle2, Circle, Download } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadIssuer } from "@/lib/dhow-profile";
import { paystackConfigured } from "@/lib/paystack";
import { invoicePayUrl } from "@/lib/payments";
import { cn, day, kes } from "@/lib/format";

const STATUS: Record<string, string> = { todo: "Not started", in_progress: "In progress", review: "Being checked", done: "Done" };

/** A client's projects with progress, then invoices with balances, PDFs and pay links. Used by the client link and by Enterprise members. */
export async function ClientWork({ clientId, token }: { clientId: string; token: string | null }) {
  const db = createAdminClient();
  const [{ data: projects }, { data: invoices }, issuer] = await Promise.all([
    db.from("projects").select("id, name, status, due_date, description").eq("client_id", clientId).order("created_at", { ascending: false }),
    db.from("invoices").select("id, number, status, issue_date, due_date, total_kes, paid_kes").eq("client_id", clientId).neq("status", "draft").neq("status", "cancelled").order("issue_date", { ascending: false }),
    loadIssuer(),
  ]);
  const ids = (projects ?? []).map((p) => p.id);
  const { data: tasks } = ids.length ? await db.from("tasks").select("id, title, status, due_date, project_id").in("project_id", ids).order("due_date", { ascending: true, nullsFirst: false }) : { data: [] };
  const today = new Date().toISOString().slice(0, 10);
  const owed = (invoices ?? []).reduce((n, i) => n + Number(i.total_kes) - Number(i.paid_kes), 0);
  const online = paystackConfigured();

  return (
    <>
        <section className="card">
          <h2 className="text-lg font-semibold">Progress</h2>
          {projects?.length ? (
            <div className="mt-4 space-y-6">
              {projects.map((p) => {
                const pt = (tasks ?? []).filter((t) => t.project_id === p.id);
                const done = pt.filter((t) => t.status === "done").length;
                const pct = p.status === "done" ? 100 : pt.length ? Math.round((done / pt.length) * 100) : 0;
                return (
                  <div key={p.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-sm text-muted">{STATUS[p.status]}{p.due_date ? ` · due ${day(p.due_date)}` : ""}</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-sunken"><div className="h-full rounded-full bg-green" style={{ width: `${pct}%` }} /></div>
                    <p className="mt-1 text-xs text-muted">{pct}% complete</p>
                    {pt.length ? (
                      <ul className="mt-3 space-y-1.5 text-sm">
                        {pt.map((t) => (
                          <li key={t.id} className="flex items-center gap-2.5">
                            {t.status === "done" ? <CheckCircle2 className="size-4 shrink-0 text-green" /> : <Circle className="size-4 shrink-0 text-faint" />}
                            <span className={cn("flex-1", t.status === "done" && "text-muted")}>{t.title}</span>
                            <span className="text-xs text-muted">{STATUS[t.status]}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : <p className="mt-2 text-sm text-muted">Your project will appear here once it starts.</p>}
        </section>

        <section className="card">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Invoices</h2>
            {owed > 0 ? <p className="text-sm">Balance due <span className="num font-semibold">{kes(owed)}</span></p> : null}
          </div>
          {invoices?.length ? (
            <ul className="mt-4 divide-y divide-line">
              {invoices.map((i) => {
                const bal = Number(i.total_kes) - Number(i.paid_kes);
                const late = bal > 0 && i.due_date < today;
                return (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">Invoice {i.number}</p>
                      <p className={cn("text-xs", late ? "font-medium text-bad" : "text-muted")}>{kes(i.total_kes)} · due {day(i.due_date)}</p>
                    </div>
                    {bal <= 0 ? <span className="rounded-full bg-mint-100 px-3 py-1 text-xs font-medium text-green">Paid</span>
                      : <span className="num rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">{kes(bal)} to pay</span>}
                    {token ? <a href={`/api/client/${token}/invoices/${i.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:bg-sunken"><Download className="size-3.5" />PDF</a> : null}
                    {bal > 0 && online ? <Link href={invoicePayUrl(i.id)} className="rounded-full bg-navy-900 px-4 py-1.5 text-xs font-medium text-white">Pay now</Link> : null}
                  </li>
                );
              })}
            </ul>
          ) : <p className="mt-2 text-sm text-muted">No invoices yet.</p>}
          {owed > 0 && (issuer.bank.account_no || issuer.paybill.number) ? (
            <div className="mt-4 grid gap-3 rounded-2xl bg-sunken/70 p-4 text-sm sm:grid-cols-2">
              {issuer.paybill.number ? <div><p className="label mb-1">M-Pesa or Airtel Money</p><p>Paybill <b className="num">{issuer.paybill.number}</b></p><p>Account <b className="num">{issuer.paybill.account}</b></p></div> : null}
              {issuer.bank.account_no ? <div><p className="label mb-1">Bank transfer</p><p>{issuer.bank.name}</p><p>{issuer.bank.account_name}</p><p className="num font-semibold">{issuer.bank.account_no}</p></div> : null}
              <p className="text-xs text-muted sm:col-span-2">Use the invoice number as the reference.</p>
            </div>
          ) : null}
        </section>

    </>
  );
}
