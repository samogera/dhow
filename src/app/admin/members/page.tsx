import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { Card, Empty, PageHeader, StatusBadge, Table, Tabs } from "@/components/ui";
import { Avatar } from "@/components/profile-bits";
import { day } from "@/lib/format";
import { PLAN_LABEL, type PlanTier } from "@/lib/types";
import { setOrgPlan } from "@/actions/admin";

export const metadata: Metadata = { title: "Member companies" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "pending", label: "In review" },
  { key: "unverified", label: "Not verified" },
  { key: "applied", label: "Applied to something" },
  { key: "not_applied", label: "Not applied yet" },
] as const;

export default async function Members({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const s = await requireStaff();
  const { q, f = "all" } = await searchParams;
  let query = s.supabase.from("organizations")
    .select("id, name, sector, country, plan, verification_status, verified_until, created_at, logo_url, tagline")
    .order("created_at", { ascending: false }).limit(1000);
  if (q) query = query.ilike("name", `%${q.replace(/[%_,()]/g, "")}%`);
  const [{ data: orgs }, { data: apps }] = await Promise.all([
    query,
    s.supabase.from("applications").select("org_id, submitted_at").neq("status", "draft"),
  ]);
  const count = new Map<string, number>();
  const last = new Map<string, string>();
  for (const a of apps ?? []) {
    count.set(a.org_id, (count.get(a.org_id) ?? 0) + 1);
    if (a.submitted_at && (!last.get(a.org_id) || a.submitted_at > last.get(a.org_id)!)) last.set(a.org_id, a.submitted_at);
  }
  const all = orgs ?? [];
  const pick = (key: string) => all.filter((o) => {
    if (key === "verified") return o.verification_status === "verified";
    if (key === "pending") return o.verification_status === "pending";
    if (key === "unverified") return !["verified", "pending"].includes(o.verification_status);
    if (key === "applied") return count.has(o.id);
    if (key === "not_applied") return !count.has(o.id);
    return true;
  });
  const rows = pick(f);
  const isAdmin = s.staffRole === "admin";
  const href = (key: string) => `/admin/members?f=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader title="Member companies" sub={`${all.length} companies on Dhow`}>
        <form className="flex">
          <input type="hidden" name="f" value={f} />
          <input name="q" defaultValue={q} placeholder="Search by name" aria-label="Search companies" className="field w-full rounded-full py-2 sm:w-64" />
        </form>
      </PageHeader>
      <Tabs current={href(f)} items={FILTERS.map((x) => ({ href: href(x.key), label: `${x.label} (${pick(x.key).length})` }))} />
      <Card>
        {rows.length ? (
          <Table head={["Company", "Joined", "Verification", "Applications", "Plan"]}>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/members/${o.id}`} className="flex items-center gap-3 hover:text-navy-700">
                    <Avatar src={o.logo_url} name={o.name} size="sm" />
                    <div className="min-w-0"><p className="truncate font-medium">{o.name}</p><p className="truncate text-xs text-muted">{[o.sector, o.country].filter(Boolean).join(" · ")}</p></div>
                  </Link>
                </td>
                <td className="text-muted">{day(o.created_at)}</td>
                <td><StatusBadge status={o.verification_status} />{o.verified_until ? <p className="mt-1 text-xs text-muted">to {day(o.verified_until)}</p> : null}</td>
                <td>
                  <p className="num font-medium">{count.get(o.id) ?? 0}</p>
                  {last.get(o.id) ? <p className="text-xs text-muted">last {day(last.get(o.id))}</p> : <p className="text-xs text-faint">none yet</p>}
                </td>
                <td>
                  {isAdmin ? (
                    <form action={setOrgPlan} className="flex gap-1">
                      <input type="hidden" name="org_id" value={o.id} />
                      <select name="plan" defaultValue={o.plan} aria-label="Plan" className="rounded-full bg-sunken px-3 py-1.5 text-xs">
                        {(Object.keys(PLAN_LABEL) as PlanTier[]).map((p) => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
                      </select>
                      <button className="text-xs text-navy-600 underline">Set</button>
                    </form>
                  ) : PLAN_LABEL[o.plan as PlanTier]}
                </td>
              </tr>
            ))}
          </Table>
        ) : <Empty title="No companies here" sub="Try another filter or search." />}
      </Card>
    </>
  );
}
