import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Download, Mail, MessageCircle, Phone } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadIssuer } from "@/lib/dhow-profile";
import { paystackConfigured } from "@/lib/paystack";
import { invoicePayUrl } from "@/lib/payments";
import { cn, day, kes } from "@/lib/format";
import { ClientReviewForm } from "./review";

export const metadata: Metadata = { title: "Your work with Dhow Partners", robots: { index: false } };

const STATUS: Record<string, string> = { todo: "Not started", in_progress: "In progress", review: "Being checked", done: "Done" };

export default async function ClientPortal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) notFound();
  const db = createAdminClient();
  const { data: c } = await db.from("clients").select("id, name").eq("portal_token", token).maybeSingle();
  if (!c) notFound();
  const [{ data: projects }, { data: invoices }, { data: reviews }, issuer] = await Promise.all([
    db.from("projects").select("id, name, status, due_date, description").eq("client_id", c.id).order("created_at", { ascending: false }),
    db.from("invoices").select("id, number, status, issue_date, due_date, total_kes, paid_kes").eq("client_id", c.id).neq("status", "draft").neq("status", "cancelled").order("issue_date", { ascending: false }),
    db.from("client_reviews").select("id").eq("client_id", c.id).limit(1),
    loadIssuer(),
  ]);
  const ids = (projects ?? []).map((p) => p.id);
  const { data: tasks } = ids.length ? await db.from("tasks").select("id, title, status, due_date, project_id").in("project_id", ids).order("due_date", { ascending: true, nullsFirst: false }) : { data: [] };
  const today = new Date().toISOString().slice(0, 10);
  const owed = (invoices ?? []).reduce((n, i) => n + Number(i.total_kes) - Number(i.paid_kes), 0);
  const online = paystackConfigured();

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 pt-8">
        <img src="/brand/wordmark-navy.png" alt="Dhow Partners" className="h-6 w-auto" />
        <a href={`mailto:${issuer.email ?? "hello@dhowpartners.com"}`} className="text-sm font-medium text-navy-600">Contact us</a>
      </header>
      <main className="mx-auto max-w-4xl space-y-5 px-5 py-10">
        <div>
          <p className="text-sm text-muted">Your work with Dhow Partners</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-navy-900">{c.name}</h1>
        </div>

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
                    <a href={`/api/client/${token}/invoices/${i.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:bg-sunken"><Download className="size-3.5" />PDF</a>
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

        <section className="card">
          <h2 className="text-lg font-semibold">{reviews?.length ? "Thank you for your review" : "How are we doing?"}</h2>
          <p className="mt-1 text-sm text-muted">Your honest feedback helps us improve.</p>
          <div className="mt-5"><ClientReviewForm token={token} /></div>
        </section>

        <section className="flex flex-wrap gap-3 text-sm">
          {issuer.phone ? <a href={`tel:${issuer.phone}`} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-sm"><Phone className="size-4 text-navy-600" />{issuer.phone}</a> : null}
          {issuer.phone ? <a href={`https://wa.me/${issuer.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-sm"><MessageCircle className="size-4 text-green" />WhatsApp</a> : null}
          {issuer.email ? <a href={`mailto:${issuer.email}`} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-sm"><Mail className="size-4 text-navy-600" />{issuer.email}</a> : null}
        </section>
      </main>
    </div>
  );
}
