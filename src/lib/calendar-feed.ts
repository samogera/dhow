import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/app-url";
import type { IcsEvent } from "@/lib/ics";

// What goes into a staff member's private calendar: dates that need action, with reminders.
// Overdue items sit on today, so they stay in view until they're dealt with.

const AM8 = -8 * 60; // 08:00 on the day
const DAY_BEFORE = 15 * 60; // 09:00 the day before
const WEEK_BEFORE = 7 * 24 * 60 - 9 * 60; // 09:00 a week before
const kes = (n: number) => `KSh ${Math.round(n).toLocaleString("en-KE")}`;

export async function feedEvents(userId: string, canSeeMoney: boolean): Promise<IcsEvent[]> {
  const db = createAdminClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
  const ahead = (n: number) => new Date(new Date(today).getTime() + n * 864e5).toISOString().slice(0, 10);
  const base = appUrl();
  const on = (d: string) => (d < today ? today : d);

  const [tasks, files, partners, invoices, bills, leads, reviews] = await Promise.all([
    db.from("tasks").select("id, title, due_date, status, priority, project_id, projects(name)").eq("assignee", userId).neq("status", "done").not("due_date", "is", null).lte("due_date", ahead(180)),
    db.from("internal_files").select("id, label, owner_type, owner_id, expires_on").not("expires_on", "is", null).lte("expires_on", ahead(180)),
    db.from("partners").select("id, name"),
    canSeeMoney ? db.from("invoices").select("id, number, due_date, total_kes, paid_kes, status, clients(name)").in("status", ["sent", "part_paid", "overdue"]).not("due_date", "is", null) : Promise.resolve({ data: [] }),
    canSeeMoney ? db.from("bills").select("id, description, payee, due_date, amount_kes, paid_kes, status").neq("status", "paid").not("due_date", "is", null).lte("due_date", ahead(180)) : Promise.resolve({ data: [] }),
    db.from("leads").select("id, name, company, next_step, next_step_date, status, owner").not("status", "in", "(won,lost)").not("next_step_date", "is", null).lte("next_step_date", ahead(90)),
    db.from("tasks").select("id, title, project_id, reviewer, assignee").eq("status", "review"),
  ]);
  const out: IcsEvent[] = [];
  const pname = (id: string | null) => partners.data?.find((p) => p.id === id)?.name;

  for (const t of (tasks.data ?? []) as unknown as { id: string; title: string; due_date: string; priority: string; project_id: string | null; projects: { name: string } | null }[]) {
    const late = t.due_date < today;
    out.push({
      uid: `task-${t.id}`, date: on(t.due_date),
      title: `${late ? "LATE: " : t.priority === "high" || t.priority === "urgent" ? "Urgent: " : ""}${t.title}`,
      description: `${t.projects?.name ? `Project: ${t.projects.name}. ` : ""}${late ? `Was due ${t.due_date}.` : "Task due today."}`,
      url: `${base}/admin/projects${t.project_id ? `/${t.project_id}` : ""}`, alarms: [DAY_BEFORE, AM8],
    });
  }
  for (const t of reviews.data ?? []) {
    if (!(t.reviewer === userId || (!t.reviewer && t.assignee !== userId))) continue;
    out.push({ uid: `review-${t.id}-${today}`, date: today, title: `Review: ${t.title}`, description: "A finished task is waiting for your check.", url: `${base}/admin/projects/${t.project_id ?? ""}`, alarms: [AM8] });
  }
  for (const f of files.data ?? []) {
    const who = f.owner_type === "dhow" ? "Dhow Partners" : pname(f.owner_id) ?? "Partner";
    const expired = f.expires_on! < today;
    out.push({
      uid: `expiry-${f.id}`, date: on(f.expires_on!),
      title: `${expired ? "EXPIRED: " : "Expires: "}${f.label} (${who})`,
      description: expired ? `Expired on ${f.expires_on}. Renew it and upload the new copy.` : "Renew before this date and upload the new copy.",
      url: f.owner_type === "dhow" ? `${base}/admin/company` : `${base}/admin/partners/${f.owner_id}`, alarms: [30 * 24 * 60 - 9 * 60, WEEK_BEFORE, AM8],
    });
  }
  for (const i of (invoices.data ?? []) as unknown as { id: string; number: string; due_date: string; total_kes: number; paid_kes: number; clients: { name: string } | null }[]) {
    const bal = Number(i.total_kes) - Number(i.paid_kes);
    if (bal <= 0) continue;
    const late = i.due_date < today;
    out.push({ uid: `invoice-${i.id}`, date: on(i.due_date), title: `${late ? "OVERDUE: " : ""}Invoice ${i.number} · ${i.clients?.name ?? "client"} owes ${kes(bal)}`,
      description: late ? `Was due ${i.due_date}. Follow up for payment.` : "Payment due today.", url: `${base}/admin/finance/invoices/${i.id}`, alarms: [DAY_BEFORE, AM8] });
  }
  for (const b of (bills.data ?? []) as { id: string; description: string; payee: string | null; due_date: string; amount_kes: number; paid_kes: number }[]) {
    const late = b.due_date < today;
    out.push({ uid: `bill-${b.id}`, date: on(b.due_date), title: `${late ? "OVERDUE: " : "Pay: "}${b.description} · ${kes(Number(b.amount_kes) - Number(b.paid_kes))}`,
      description: `${b.payee ? `To ${b.payee}. ` : ""}${late ? `Was due ${b.due_date}.` : "Due today."}`, url: `${base}/admin/finance?tab=bills`, alarms: [3 * 24 * 60 - 9 * 60, DAY_BEFORE, AM8] });
  }
  for (const l of (leads.data ?? []) as { id: string; name: string; company: string | null; next_step: string | null; next_step_date: string; owner: string | null }[]) {
    if (l.owner && l.owner !== userId) continue;
    out.push({ uid: `lead-${l.id}`, date: on(l.next_step_date), title: `Follow up: ${l.company ?? l.name}`, description: l.next_step ?? "Next step with this lead.", url: `${base}/admin/leads`, alarms: [AM8] });
  }
  return out;
}
