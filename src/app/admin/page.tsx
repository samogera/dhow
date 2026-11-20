import Link from "next/link";
import { BadgeCheck, CalendarDays, CheckCircle2, Circle, Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { upcomingEvents } from "@/lib/calendar";
import { BarChart } from "@/components/bar-chart";
import { ButtonAnchor, ButtonLink, Card, CardHeader, Empty, PageHeader, Stat, StatusBadge } from "@/components/ui";
import { day, kes, time } from "@/lib/format";
import { toggleTask } from "@/actions/admin";

export default async function AdminHome() {
  const s = await requireStaff();
  const db = s.supabase;
  const today = new Date().toISOString().slice(0, 10);
  const sixMonthsAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString().slice(0, 10);

  const [pos, reviews, tasks, leads, paid, events] = await Promise.all([
    db.from("finance_position").select("*").single(),
    db.from("verifications").select("id, tier, created_at, organizations(name)").eq("status", "in_review").order("created_at").limit(5),
    db.from("tasks").select("id, title, due_date, status, projects(name)").neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(8),
    db.from("leads").select("est_value_kes, status").not("status", "in", "(won,lost)"),
    db.from("invoice_payments").select("amount_kes, paid_on").gte("paid_on", sixMonthsAgo),
    upcomingEvents(s.user.id, 7).catch(() => null),
  ]);

  const p = pos.data ?? { received_kes: 0, owed_by_clients_kes: 0, paid_out_kes: 0, owed_to_partners_kes: 0 };
  const net = Number(p.received_kes) + Number(p.owed_by_clients_kes) - Number(p.paid_out_kes) - Number(p.owed_to_partners_kes);
  const pipeline = (leads.data ?? []).reduce((sum, l) => sum + Number(l.est_value_kes ?? 0), 0);

  // Money received per month, last 6 months.
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - 5 + i, 1);
    return { key: d.toISOString().slice(0, 7), label: d.toLocaleString("en-GB", { month: "short" }), value: 0 };
  });
  for (const r of paid.data ?? []) {
    const m = months.find((x) => x.key === String(r.paid_on).slice(0, 7));
    if (m) m.value += Number(r.amount_kes);
  }
  const first = s.profile?.full_name?.split(" ")[0];

  return (
    <>
      <PageHeader title="Good to see you," accent={first ?? "team"} sub="Everything that needs you today, in one place.">
        <ButtonLink href="/admin/finance/invoices/new" variant="outline"><Plus className="size-4" /> New invoice</ButtonLink>
        <ButtonLink href="/admin/reviews" variant="accent"><BadgeCheck className="size-4" /> Reviews ({reviews.data?.length ?? 0})</ButtonLink>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat highlight label="Net position" value={kes(net)} note="Received + owed to us − paid out − owed by us" />
        <Stat label="Owed to us" value={kes(p.owed_by_clients_kes)} note="Unpaid client invoices" />
        <Stat label="Owed by us" value={kes(p.owed_to_partners_kes)} note="Partner and vendor bills" />
        <Stat label="Open pipeline" value={kes(pipeline)} note={`${leads.data?.length ?? 0} active leads`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Money received" sub="Client payments by month" href="/admin/finance" />
          <BarChart data={months.map(({ label, value }) => ({ label, value }))} highlight={5} />
        </Card>
        <Card>
          <CardHeader title="This week" sub="From your Google Calendar" href="/admin/calendar" />
          {events === null ? (
            <Empty title="Calendar not connected" sub="Connect Google Calendar to see client pitches and reviews here.">
              <ButtonAnchor href="/api/calendar/connect" variant="outline"><CalendarDays className="size-4" /> Connect</ButtonAnchor>
            </Empty>
          ) : events.length ? (
            <ul className="space-y-3">
              {events.slice(0, 5).map((e) => (
                <li key={e.id} className="flex gap-3 rounded-2xl bg-sunken p-3">
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-xs text-muted">{new Date(e.start).toLocaleDateString("en-GB", { weekday: "short", timeZone: "Africa/Nairobi" })}</p>
                    <p className="text-sm font-semibold">{e.allDay ? "All day" : time(e.start)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="truncate text-xs text-muted">{e.location ?? (e.attendees ? `${e.attendees} people` : "")}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No meetings in the next 7 days.</p>}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Open tasks" sub="Soonest due first" href="/admin/projects" />
          {tasks.data?.length ? (
            <ul className="divide-y divide-line">
              {(tasks.data as unknown as { id: string; title: string; due_date: string | null; projects: { name: string } | null }[]).map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <form action={toggleTask}>
                    <input type="hidden" name="id" value={t.id} /><input type="hidden" name="done" value="1" />
                    <button aria-label={`Mark ${t.title} done`} className="text-faint hover:text-good"><Circle className="size-5" /></button>
                  </form>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{t.title}</p>
                    {t.projects ? <p className="truncate text-xs text-muted">{t.projects.name}</p> : null}
                  </div>
                  {t.due_date ? <span className={t.due_date < today ? "text-xs font-medium text-bad" : "text-xs text-muted"}>{day(t.due_date)}</span> : null}
                </li>
              ))}
            </ul>
          ) : <Empty title="All clear" sub="No open tasks."><CheckCircle2 className="mx-auto size-6 text-good" /></Empty>}
        </Card>
        <Card>
          <CardHeader title="Waiting for review" sub="Verification requests, oldest first" href="/admin/reviews" />
          {reviews.data?.length ? (
            <ul className="divide-y divide-line">
              {(reviews.data as unknown as { id: string; tier: string; created_at: string; organizations: { name: string } }[]).map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/reviews/${r.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <span className="text-sm font-medium">{r.organizations?.name}</span>
                    <span className="flex items-center gap-3 text-xs text-muted">{r.tier === "instant" ? "Paid" : "Free"} · {day(r.created_at)} <StatusBadge status="in_review" /></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Nothing waiting.</p>}
        </Card>
      </div>
    </>
  );
}
