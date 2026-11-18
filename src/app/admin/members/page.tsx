import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { Card, PageHeader, StatusBadge, Table } from "@/components/ui";
import { bytes, day } from "@/lib/format";
import { PLAN_LABEL, type PlanTier } from "@/lib/types";
import { setOrgPlan } from "@/actions/admin";

export const metadata: Metadata = { title: "Member companies" };

export default async function Members({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await requireStaff();
  const { q } = await searchParams;
  let query = s.supabase.from("organizations").select("id, name, sector, country, plan, verification_status, verified_until, storage_used_bytes, created_at").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  const { data: orgs } = await query;
  const isAdmin = s.staffRole === "admin";

  return (
    <>
      <PageHeader title="Member companies" sub={`${orgs?.length ?? 0} companies on Dhow`}>
        <form className="flex"><input name="q" defaultValue={q} placeholder="Search by name" className="field w-64 rounded-full py-2" /></form>
      </PageHeader>
      <Card>
        <Table head={["Company", "Sector", "Joined", "Verification", "Storage", "Plan"]}>
          {(orgs ?? []).map((o) => (
            <tr key={o.id}>
              <td><p className="font-medium">{o.name}</p><p className="text-xs text-muted">{o.country}</p></td>
              <td className="text-muted">{o.sector ?? "—"}</td>
              <td className="text-muted">{day(o.created_at)}</td>
              <td><StatusBadge status={o.verification_status} />{o.verified_until ? <p className="mt-1 text-xs text-muted">to {day(o.verified_until)}</p> : null}</td>
              <td className="num text-muted">{bytes(o.storage_used_bytes)}</td>
              <td>
                {isAdmin ? (
                  <form action={setOrgPlan} className="flex gap-1">
                    <input type="hidden" name="org_id" value={o.id} />
                    <select name="plan" defaultValue={o.plan} className="rounded-full bg-sunken px-3 py-1.5 text-xs">
                      {(Object.keys(PLAN_LABEL) as PlanTier[]).map((p) => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
                    </select>
                    <button className="text-xs text-forest-600 underline">Set</button>
                  </form>
                ) : PLAN_LABEL[o.plan as PlanTier]}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
