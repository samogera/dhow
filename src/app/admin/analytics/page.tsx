import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, Download, CalendarDays, CreditCard, Inbox, ListChecks, Megaphone, Send } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { AreaChart, BarList, ColumnChart } from "@/components/charts";
import { Card, CardHeader, PageHeader, Stat, Table } from "@/components/ui";
import { label } from "@/lib/format";
import { kindLabel } from "@/lib/opportunity-display";
import { PLAN_LABEL, type PlanTier } from "@/lib/types";

export const metadata: Metadata = { title: "Analytics" };

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "Africa/Nairobi" });
function lastMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1));
    return { key: d.toISOString().slice(0, 7), label: monthFmt.format(d) };
  });
}
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default async function Analytics() {
  const s = await requireStaff();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: orgs }, { data: apps }, { data: opps }] = await Promise.all([
    s.supabase.from("organizations").select("id, created_at, verification_status, plan, sector, country").limit(5000),
    s.supabase.from("applications").select("org_id, opportunity_id, status, submitted_at").neq("status", "draft").limit(10000),
    s.supabase.from("opportunities").select("id, title, kind, published, deadline, starts_on, imported_at, source, dismissed_at").order("created_at", { ascending: false }).limit(3000),
  ]);
  const O = orgs ?? [], A = apps ?? [], P = opps ?? [];

  const verified = O.filter((o) => o.verification_status === "verified").length;
  const pending = O.filter((o) => o.verification_status === "pending").length;
  const paid = O.filter((o) => o.plan !== "free").length;
  const applied = new Set(A.map((a) => a.org_id));
  const live = P.filter((p) => p.published && !p.dismissed_at && (!p.deadline || p.deadline >= today));
  const events = live.filter((p) => p.kind === "event");

  const months = lastMonths(12);
  const joins = months.map((m) => ({ label: m.label, value: O.filter((o) => o.created_at.startsWith(m.key)).length }));
  const members = months.map((m, i) => {
    const end = i === months.length - 1 ? "9999" : months[i + 1].key;
    const added = joins[i].value;
    return { label: m.label, value: O.filter((o) => o.created_at.slice(0, 7) < end).length, note: added ? `+${added} joined` : "No new companies" };
  });
  const appsByMonth = months.map((m) => {
    const inMonth = A.filter((a) => a.submitted_at?.startsWith(m.key));
    return { label: m.label, value: inMonth.length, note: `${new Set(inMonth.map((a) => a.org_id)).size} companies` };
  });

  const verRows = ["verified", "pending", "unverified", "rejected", "expired"].map((v) => ({
    label: v === "pending" ? "In review" : label(v), value: O.filter((o) => o.verification_status === v).length,
    href: `/admin/members?f=${v === "verified" ? "verified" : v === "pending" ? "pending" : "unverified"}`,
  })).filter((r) => r.value);
  const planRows = (Object.keys(PLAN_LABEL) as PlanTier[]).map((p) => ({ label: PLAN_LABEL[p], value: O.filter((o) => o.plan === p).length })).filter((r) => r.value);
  const tally = (xs: (string | null)[]) => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x || "Not given", (m.get(x || "Not given") ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => ({ label: k, value: v }));
  };
  const statusRows = ["submitted", "shortlisted", "won", "lost"].map((st) => ({ label: label(st), value: A.filter((a) => a.status === st).length })).filter((r) => r.value);

  const byOpp = new Map<string, { n: number; won: number; orgs: Set<string> }>();
  for (const a of A) {
    const e = byOpp.get(a.opportunity_id) ?? { n: 0, won: 0, orgs: new Set() };
    e.n++; if (a.status === "won") e.won++; e.orgs.add(a.org_id);
    byOpp.set(a.opportunity_id, e);
  }
  const top = [...byOpp.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 10)
    .map(([id, e]) => ({ id, ...e, opp: P.find((p) => p.id === id) }));
  const kindRows = tally(A.map((a) => { const k = P.find((p) => p.id === a.opportunity_id)?.kind; return k ? kindLabel(k) : null; }));

  return (
    <>
      <PageHeader title="Analytics" sub="Members, verification and opportunities at a glance. Figures are live.">
        <div className="flex flex-wrap gap-2">
          <a href="/api/analytics/export?format=pdf" className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-700"><Download className="size-4" />PDF report</a>
          <a href="/api/analytics/export?format=xlsx" className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium hover:bg-sunken"><Download className="size-4" />Excel</a>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Building2} label="Companies" value={O.length} note={`${joins.at(-1)?.value ?? 0} joined this month`} />
        <Stat icon={BadgeCheck} label="Verified" value={verified} note={`${pct(verified, O.length)}% of members · ${pending} in review`} highlight />
        <Stat icon={Send} label="Applied to something" value={applied.size} note={<Link href="/admin/members?f=not_applied" className="underline">{O.length - applied.size} haven&apos;t yet</Link>} />
        <Stat icon={ListChecks} label="Applications tracked" value={A.length} note={`${A.filter((a) => a.status === "won").length} won`} />
        <Stat icon={CreditCard} label="Paid plans" value={paid} note={`${O.length - paid} on Free`} />
        <Stat icon={Megaphone} label="Live opportunities" value={live.length} note={`${live.filter((p) => p.imported_at).length} imported · ${live.filter((p) => !p.imported_at).length} added by Dhow`} />
        <Stat icon={CalendarDays} label="Upcoming events" value={events.length} note={<Link href="/admin/opportunities?tab=events" className="underline">Manage events</Link>} />
        <Stat icon={Inbox} label="Waiting for review" value={P.filter((p) => !p.published && !p.dismissed_at && p.imported_at && (!p.deadline || p.deadline >= today)).length} note={<Link href="/admin/opportunities" className="underline">Review imports</Link>} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div><p className="font-semibold text-navy-900">Companies</p><p className="text-sm text-muted">Total on Dhow, last 12 months</p></div>
            <div className="text-right"><p className="num text-2xl font-semibold tracking-tight">{O.length}</p><p className="text-xs text-muted">+{joins.at(-1)?.value ?? 0} this month</p></div>
          </div>
          <AreaChart data={members} unit="companies" label="Companies over the last 12 months" />
        </Card>
        <Card className="p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div><p className="font-semibold text-navy-900">Applications</p><p className="text-sm text-muted">Tracked by members each month</p></div>
            <div className="text-right"><p className="num text-2xl font-semibold tracking-tight">{appsByMonth.at(-1)?.value ?? 0}</p><p className="text-xs text-muted">this month</p></div>
          </div>
          <ColumnChart data={appsByMonth} unit="applications" label="Applications per month over the last 12 months" />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader title="Verification" /><BarList rows={verRows} total={O.length} empty="No companies yet." /></Card>
        <Card><CardHeader title="Plans" /><BarList rows={planRows} total={O.length} empty="No companies yet." /></Card>
        <Card><CardHeader title="Sectors" /><BarList rows={tally(O.map((o) => o.sector))} total={O.length} empty="No companies yet." /></Card>
        <Card><CardHeader title="Application outcomes" /><BarList rows={statusRows} total={A.length} empty="No applications yet." /></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Most applied opportunities" sub="Which opportunities members act on" />
          {top.length ? (
            <Table head={["Opportunity", "Kind", "Companies", "Won"]}>
              {top.map((t) => (
                <tr key={t.id}>
                  <td>{t.opp ? <Link href={`/admin/opportunities/${t.id}`} className="line-clamp-2 font-medium hover:text-navy-700">{t.opp.title}</Link> : <span className="text-muted">Removed</span>}</td>
                  <td className="text-muted">{t.opp ? kindLabel(t.opp.kind) : "—"}</td>
                  <td className="num">{t.orgs.size}</td>
                  <td className="num">{t.won}</td>
                </tr>
              ))}
            </Table>
          ) : <p className="py-8 text-center text-sm text-muted">No applications yet. Once members track opportunities, the most popular show here.</p>}
        </Card>
        <div className="space-y-4">
          <Card><CardHeader title="What members apply to" /><BarList rows={kindRows} total={A.length} empty="No applications yet." /></Card>
          <Card><CardHeader title="Countries" /><BarList rows={tally(O.map((o) => o.country))} total={O.length} empty="No companies yet." /></Card>
        </div>
      </div>
    </>
  );
}
