import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Alert = { id: string; level: "urgent" | "soon"; kind: "licence" | "invoice" | "bill" | "task" | "review" | "lead"; title: string; detail: string; href: string; date?: string };

const days = (d: string, today: string) => Math.round((new Date(d).getTime() - new Date(today).getTime()) / 864e5);
const when = (n: number) => (n < 0 ? `${-n} day${n === -1 ? "" : "s"} ago` : n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`);

/** Everything that needs attention: expiring licences and documents, overdue money, late tasks, reviews waiting. */
export async function loadAlerts(db: SupabaseClient, userId: string, canSeeMoney: boolean): Promise<Alert[]> {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
  const soon = (n: number) => new Date(new Date(today).getTime() + n * 864e5).toISOString().slice(0, 10);
  const [files, partners, invoices, bills, tasks, reviews, leads] = await Promise.all([
    db.from("internal_files").select("id, label, owner_type, owner_id, expires_on").not("expires_on", "is", null).lte("expires_on", soon(45)),
    db.from("partners").select("id, name"),
    canSeeMoney ? db.from("invoices").select("id, number, due_date, total_kes, paid_kes, status, clients(name)").in("status", ["sent", "part_paid", "overdue"]).lte("due_date", soon(3)) : Promise.resolve({ data: [] }),
    canSeeMoney ? db.from("bills").select("id, description, payee, due_date, amount_kes, paid_kes, status").neq("status", "paid").not("due_date", "is", null).lte("due_date", soon(7)) : Promise.resolve({ data: [] }),
    db.from("tasks").select("id, title, due_date, status, project_id, assignee, reviewer").neq("status", "done"),
    db.from("verifications").select("id", { count: "exact", head: true }).eq("status", "in_review"),
    db.from("leads").select("id, name, company, next_step, next_step_date, status").not("status", "in", "(won,lost)").not("next_step_date", "is", null).lte("next_step_date", today),
  ]);
  const out: Alert[] = [];
  const pname = (id: string | null) => partners.data?.find((p) => p.id === id)?.name;

  for (const f of files.data ?? []) {
    const n = days(f.expires_on!, today);
    out.push({
      id: `f${f.id}`, level: n <= 14 ? "urgent" : "soon", kind: "licence",
      title: `${f.label} ${n < 0 ? "has expired" : "expires " + when(n)}`,
      detail: f.owner_type === "dhow" ? "Dhow Partners document" : `Partner: ${pname(f.owner_id) ?? "unknown"}`,
      href: f.owner_type === "dhow" ? "/admin/company" : `/admin/partners/${f.owner_id}`, date: f.expires_on!,
    });
  }
  for (const i of (invoices.data ?? []) as { id: string; number: string; due_date: string; total_kes: number; paid_kes: number; clients: unknown }[]) {
    const bal = Number(i.total_kes) - Number(i.paid_kes);
    if (bal <= 0) continue;
    const n = days(i.due_date, today);
    out.push({ id: `i${i.id}`, level: n < 0 ? "urgent" : "soon", kind: "invoice", title: `Invoice ${i.number} ${n < 0 ? "is overdue" : "is due " + when(n)}`,
      detail: `${(i.clients as { name: string } | null)?.name ?? "Client"} owes KSh ${bal.toLocaleString("en-KE")}`, href: `/admin/finance/invoices/${i.id}`, date: i.due_date });
  }
  for (const b of (bills.data ?? []) as { id: string; description: string; payee: string | null; due_date: string; amount_kes: number; paid_kes: number }[]) {
    const n = days(b.due_date, today);
    out.push({ id: `b${b.id}`, level: n <= 2 ? "urgent" : "soon", kind: "bill", title: `${b.description} ${n < 0 ? "was due " + when(n) : "is due " + when(n)}`,
      detail: `${b.payee ? b.payee + " · " : ""}KSh ${(Number(b.amount_kes) - Number(b.paid_kes)).toLocaleString("en-KE")} to pay`, href: "/admin/finance?tab=bills", date: b.due_date });
  }
  for (const t of tasks.data ?? []) {
    if (t.status === "review" && (t.reviewer === userId || (!t.reviewer && t.assignee !== userId))) {
      out.push({ id: `r${t.id}`, level: "soon", kind: "review", title: `Check: ${t.title}`, detail: "Waiting for your review", href: `/admin/projects/${t.project_id}` });
      continue;
    }
    if (!t.due_date || t.assignee !== userId) continue;
    const n = days(t.due_date, today);
    if (n > 2) continue;
    out.push({ id: `t${t.id}`, level: n < 0 ? "urgent" : "soon", kind: "task", title: t.title, detail: n < 0 ? `Late, was due ${when(n)}` : `Due ${when(n)}`, href: t.project_id ? `/admin/projects/${t.project_id}` : "/admin/projects", date: t.due_date });
  }
  if (reviews.count) out.push({ id: "verif", level: "soon", kind: "review", title: `${reviews.count} compan${reviews.count === 1 ? "y is" : "ies are"} waiting for verification`, detail: "Verification reviews", href: "/admin/reviews" });
  for (const l of leads.data ?? []) {
    out.push({ id: `l${l.id}`, level: "soon", kind: "lead", title: `Follow up: ${l.company ?? l.name}`, detail: l.next_step ?? "Next step is due", href: "/admin/leads", date: l.next_step_date! });
  }
  return out.sort((a, b) => (a.level === b.level ? (a.date ?? "9").localeCompare(b.date ?? "9") : a.level === "urgent" ? -1 : 1));
}
