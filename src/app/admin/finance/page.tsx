import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { ButtonLink, Card, CardHeader, Empty, Field, Input, PageHeader, Select, Stat, StatusBadge, Table, Tabs } from "@/components/ui";
import { day, kes } from "@/lib/format";
import { addBill, markInvoicePaid, payBill, setBankBalance } from "@/actions/admin";
import { Download, Landmark } from "lucide-react";
import { Drawer } from "@/components/drawer";
import { createAdminClient } from "@/lib/supabase/admin";
import { ShareCalculator } from "./calculator";
import { BILL_CATEGORY_LABEL, BILL_TONE } from "@/lib/bills";

export const metadata: Metadata = { title: "Finance" };

export default async function Finance({ searchParams }: { searchParams: Promise<{ tab?: string; show?: string; cat?: string }> }) {
  const s = await requireStaff(["finance"]);
  const { tab = "invoices", show = "all", cat } = await searchParams;
  const [{ data: pos }, { data: invoices }, { data: bills }, { data: partners }, { data: projects }] = await Promise.all([
    s.supabase.from("finance_position").select("*").single(),
    s.supabase.from("invoices").select("id, number, status, issue_date, due_date, total_kes, paid_kes, clients(name)").order("created_at", { ascending: false }).limit(200),
    s.supabase.from("bills").select("id, description, amount_kes, paid_kes, due_date, status, category, payee, repeats, partners(name)").order("due_date", { ascending: true, nullsFirst: false }),
    s.supabase.from("partners").select("id, name").order("name"),
    s.supabase.from("projects").select("id, name").neq("status", "done").order("name"),
  ]);
  const { data: people } = tab === "bills" ? await s.supabase.from("team_people").select("full_name").eq("active", true) : { data: null };
  const { data: received } = tab === "calculator" ? await s.supabase.from("invoice_payments").select("amount_kes, paid_on") : { data: null };
  const now = new Date();
  const ym = now.toISOString().slice(0, 7), yr = now.toISOString().slice(0, 4);
  const sumWhere = (f: (d: string) => boolean) => (received ?? []).filter((r) => f(r.paid_on)).reduce((n, r) => n + Number(r.amount_kes), 0);
  const presets = [
    { label: "Received this month", amount: sumWhere((d) => d.startsWith(ym)) },
    { label: "Received this year", amount: sumWhere((d) => d.startsWith(yr)) },
    { label: "All received", amount: sumWhere(() => true) },
  ].filter((p) => p.amount > 0);
  const { data: bank } = await createAdminClient().from("dhow_profile").select("bank_name, bank_account_no, bank_balance, bank_balance_at").eq("id", 1).maybeSingle();
  const p = pos ?? { received_kes: 0, owed_by_clients_kes: 0, paid_out_kes: 0, owed_to_partners_kes: 0 };
  const net = Number(p.received_kes) + Number(p.owed_by_clients_kes) - Number(p.paid_out_kes) - Number(p.owed_to_partners_kes);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Finance" sub="Net position = (received + owed by clients) − (paid out + owed to partners)">
        <div className="flex flex-wrap gap-2">
          <Drawer label="Download" title="Download finance records" sub="CSV files open in Excel and Google Sheets." variant="outline" plus={false}>
            <div className="space-y-3">
              {[["invoices", "All invoices", "Number, client, dates, totals, paid and balance"], ["payments", "Payments received", "Every M-Pesa, bank and card payment"], ["bills", "Partner bills", "What we owe partners and what's paid"]].map(([k, t, d]) => (
                <a key={k} href={`/api/finance/export?kind=${k}`} className="flex items-center gap-4 rounded-2xl border border-line p-4 transition hover:bg-sunken">
                  <span className="grid size-10 place-items-center rounded-xl bg-navy-50 text-navy-700"><Download className="size-5" /></span>
                  <span><span className="block font-medium">{t}</span><span className="block text-sm text-muted">{d}</span></span>
                </a>
              ))}
              <p className="text-xs text-muted">Each invoice&apos;s PDF is on its own page under Download PDF.</p>
            </div>
          </Drawer>
          <ButtonLink href="/admin/finance/invoices/new">New invoice</ButtonLink>
        </div>
      </PageHeader>

      <div className="card mb-4 flex flex-wrap items-center gap-4">
        <span className="grid size-11 place-items-center rounded-2xl bg-navy-900 text-white"><Landmark className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="label">{bank?.bank_name ?? "Bank"}{bank?.bank_account_no ? ` · ···${bank.bank_account_no.slice(-4)}` : ""}</p>
          <p className="num text-2xl font-semibold tracking-tight">{bank?.bank_balance != null ? kes(bank.bank_balance) : "Balance not entered"}</p>
          <p className="text-xs text-muted">{bank?.bank_balance_at ? `From your statement on ${day(bank.bank_balance_at)}. Not a live bank feed.` : "Enter the balance from your I&M app or statement to keep it here."}</p>
        </div>
        <Drawer label="Update balance" title="Update bank balance" sub="Copy it from the I&M app or your latest statement." variant="outline" plus={false}>
          <ActionForm action={setBankBalance} submit="Save balance" className="grid gap-3 sm:grid-cols-2">
            <Field label="Balance (KES)"><Input name="bank_balance" type="number" step="any" inputMode="decimal" required defaultValue={bank?.bank_balance ?? ""} /></Field>
            <Field label="As at"><Input name="bank_balance_at" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
          </ActionForm>
        </Drawer>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <Stat label="Net position" value={<span className="num">{kes(net)}</span>} highlight />
        <Stat label="Received" value={<span className="num">{kes(p.received_kes)}</span>} />
        <Stat label="Clients owe us" value={<span className="num">{kes(p.owed_by_clients_kes)}</span>} />
        <Stat label="Paid out" value={<span className="num">{kes(p.paid_out_kes)}</span>} />
        <Stat label="We owe partners" value={<span className="num">{kes(p.owed_to_partners_kes)}</span>} />
      </div>

      <div className="mt-8">
        <Tabs current={`/admin/finance?tab=${tab}`} items={[{ href: "/admin/finance?tab=invoices", label: "Invoices" }, { href: "/admin/finance?tab=bills", label: "Bills and expenses" }, { href: "/admin/finance?tab=calculator", label: "Share calculator" }]} />
      </div>

      {tab === "calculator" ? (
        <ShareCalculator presets={presets} />
      ) : tab === "bills" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card>
            {(() => {
              const all = bills ?? [];
              const unpaid = all.filter((b) => b.status !== "paid");
              const due = unpaid.reduce((n, b) => n + Number(b.amount_kes) - Number(b.paid_kes), 0);
              const cats = [...new Set(all.map((b) => b.category))];
              const shown = all.filter((b) => !cat || b.category === cat);
              return (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Link href="/admin/finance?tab=bills" className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${!cat ? "bg-navy-900 text-white" : "bg-sunken text-ink/70"}`}>All</Link>
                      {cats.map((c) => <Link key={c} href={`/admin/finance?tab=bills&cat=${c}`} className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${cat === c ? "bg-navy-900 text-white" : "bg-sunken text-ink/70"}`}>{BILL_CATEGORY_LABEL[c] ?? c}</Link>)}
                    </div>
                    <p className="text-sm text-muted">Still to pay: <span className="num font-semibold text-ink">{kes(due)}</span></p>
                  </div>
                  {shown.length ? (
                    <Table head={["Bill", "Due", "Amount", "Still to pay", ""]}>
                      {shown.map((b) => {
                        const left = Number(b.amount_kes) - Number(b.paid_kes);
                        const late = b.due_date && b.due_date < today && left > 0;
                        return (
                          <tr key={b.id}>
                            <td>
                              <p className="font-medium">{b.description}</p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BILL_TONE[b.category] ?? ""}`}>{BILL_CATEGORY_LABEL[b.category] ?? b.category}</span>
                                {b.payee || (b.partners as unknown as { name: string } | null)?.name ? <span>{b.payee ?? (b.partners as unknown as { name: string }).name}</span> : null}
                                {b.repeats !== "once" ? <span>· repeats {b.repeats}</span> : null}
                              </p>
                            </td>
                            <td className={late ? "font-medium text-bad" : "text-muted"}>{b.due_date ? day(b.due_date) : "—"}</td>
                            <td className="num">{kes(b.amount_kes)}</td>
                            <td className="num">{left > 0 ? kes(left) : <StatusBadge status="paid" />}</td>
                            <td>
                              {left > 0 ? (
                                <form action={payBill} className="flex gap-1">
                                  <input type="hidden" name="id" value={b.id} />
                                  <input name="amount_kes" type="number" min="1" step="any" defaultValue={left} aria-label="Amount paid" className="w-28 rounded-full bg-sunken px-3 py-1.5 text-xs" />
                                  <button className="rounded-full bg-green px-3 py-1.5 text-xs font-medium text-white">Paid</button>
                                </form>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </Table>
                  ) : <Empty title="No bills yet" sub="Add rent, salaries, registrations, licences and partner bills to see a true net position." />}
                </>
              );
            })()}
          </Card>
          <Card>
            <CardHeader title="Add a bill" sub="Rent and salaries can repeat: when one is paid, the next is added." />
            <ActionForm action={addBill} submit="Add bill" className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="What it's for"><Input name="description" required placeholder="Office rent, Embassy House" /></Field></div>
              <Field label="Type"><Select name="category" defaultValue="rent">{Object.entries(BILL_CATEGORY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
              <Field label="Paid to"><Input name="payee" list="payees" placeholder="Landlord, staff member, KRA…" /></Field>
              <datalist id="payees">{(people ?? []).map((p) => <option key={p.full_name} value={p.full_name} />)}</datalist>
              <Field label="Amount (KES)"><Input name="amount_kes" type="number" min="1" step="any" required /></Field>
              <Field label="Due"><Input name="due_date" type="date" /></Field>
              <Field label="Repeats"><Select name="repeats" defaultValue="once"><option value="once">Once</option><option value="monthly">Every month</option><option value="yearly">Every year</option></Select></Field>
              <Field label="Partner (if any)"><Select name="partner_id" defaultValue=""><option value="">None</option>{partners?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
              <div className="sm:col-span-2"><Field label="Project (if any)"><Select name="project_id" defaultValue=""><option value="">None</option>{projects?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field></div>
            </ActionForm>
          </Card>
        </div>
      ) : (
        <Card>
          {(() => {
            const bal = (i: { total_kes: number; paid_kes: number }) => Number(i.total_kes) - Number(i.paid_kes);
            const state = (i: { status: string; due_date: string; total_kes: number; paid_kes: number }) =>
              i.status === "cancelled" ? "cancelled" : i.status === "draft" ? "draft" : bal(i) <= 0 ? "paid" : i.due_date < today ? "overdue" : Number(i.paid_kes) > 0 ? "part_paid" : "unpaid";
            const all = invoices ?? [];
            const groups: Record<string, (i: (typeof all)[number]) => boolean> = {
              all: () => true, unpaid: (i) => ["unpaid", "part_paid", "overdue"].includes(state(i)), overdue: (i) => state(i) === "overdue",
              paid: (i) => state(i) === "paid", draft: (i) => state(i) === "draft",
            };
            const rows = all.filter(groups[show] ?? groups.all);
            const owedTotal = all.filter(groups.unpaid).reduce((n, i) => n + bal(i), 0);
            return (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {[["all", "All"], ["unpaid", "Not paid"], ["overdue", "Overdue"], ["paid", "Paid"], ["draft", "Drafts"]].map(([k, l]) => (
                      <Link key={k} href={`/admin/finance?show=${k}`} className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${show === k ? "bg-navy-900 text-white" : "bg-sunken text-ink/70 hover:text-ink"}`}>
                        {l} <span className="opacity-60">{all.filter(groups[k]).length}</span>
                      </Link>
                    ))}
                  </div>
                  <p className="text-sm text-muted">Waiting to be paid: <span className="num font-semibold text-ink">{kes(owedTotal)}</span></p>
                </div>
                {rows.length ? (
                  <Table head={["No.", "Client", "Due", "Total", "Still owed", "Status", ""]}>
                    {rows.map((i) => {
                      const st = state(i);
                      return (
                        <tr key={i.id} className="hover:bg-white/70">
                          <td><Link href={`/admin/finance/invoices/${i.id}`} className="font-medium hover:text-navy-700">{i.number}</Link></td>
                          <td>{(i.clients as unknown as { name: string } | null)?.name}</td>
                          <td className={st === "overdue" ? "font-medium text-bad" : "text-muted"}>{day(i.due_date)}</td>
                          <td className="num">{kes(i.total_kes)}</td>
                          <td className="num">{bal(i) > 0 && st !== "cancelled" ? kes(bal(i)) : "—"}</td>
                          <td><StatusBadge status={st} /></td>
                          <td>
                            {["unpaid", "part_paid", "overdue"].includes(st) ? (
                              <form action={markInvoicePaid} className="flex items-center gap-1">
                                <input type="hidden" name="id" value={i.id} />
                                <select name="method" defaultValue="M-Pesa" aria-label="Paid by" className="rounded-full bg-sunken px-2 py-1 text-xs"><option>M-Pesa</option><option>I&amp;M Bank</option><option>Airtel Money</option><option>Cash</option></select>
                                <button className="whitespace-nowrap rounded-full bg-green px-3 py-1 text-xs font-medium text-white">Mark paid</button>
                              </form>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </Table>
                ) : all.length ? <p className="py-8 text-center text-sm text-muted">No invoices here.</p>
                  : <Empty title="No invoices yet" sub="Create your first invoice to start tracking what clients owe."><ButtonLink href="/admin/finance/invoices/new">New invoice</ButtonLink></Empty>}
              </>
            );
          })()}
        </Card>
      )}
    </>
  );
}
