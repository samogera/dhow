import type { Metadata } from "next";
import Link from "next/link";
import { isOrgAdmin, requireMember } from "@/lib/auth";
import { confirmPaystack } from "@/lib/payments";
import { Meter, PageHeader } from "@/components/ui";
import { SettingsTabs } from "@/components/settings-tabs";
import { TIERS, tierOf } from "@/lib/plans";
import { bytes, cn, day } from "@/lib/format";
import { PlanPicker } from "./picker";

export const metadata: Metadata = { title: "Membership plans" };

export default async function Plans({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  // Back from Paystack: confirm first, so the page shows the new plan.
  const paid = reference?.startsWith("DM-") ? await confirmPaystack(reference).catch(() => null) : null;
  const { org, role, supabase } = await requireMember();
  const current = tierOf(org);
  const tier = TIERS[current];
  const monthStart = `${new Date().toISOString().slice(0, 7)}-01T00:00:00Z`;
  const [{ count: docs }, { count: apps }] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("org_id", org.id).neq("status", "rejected").neq("status", "pending_upload"),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("org_id", org.id).gte("created_at", monthStart),
  ]);
  const paidTier = current === "premium" || current === "business";

  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs />

      {paid ? (
        <p className={cn("mb-4 rounded-2xl px-5 py-4 text-sm", paid.state === "paid" ? "bg-good/10 text-good" : paid.state === "failed" ? "bg-bad/10 text-bad" : "bg-warn/10 text-warn")}>
          {paid.message}{paid.receipt ? ` Reference ${paid.receipt}.` : ""}
        </p>
      ) : null}

      <section className="card mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">Your plan</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{tier.name}</p>
            <p className="mt-1 text-sm text-muted">
              {paidTier && org.plan_until ? `Paid ${org.plan_period === "yearly" ? "yearly" : "monthly"} · runs until ${day(org.plan_until)}` : paidTier ? "Set up by the Dhow team" : tier.tagline}
            </p>
          </div>
          {current === "free" ? <Link href="/app/verification" className="rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">Get verified for Basic</Link> : null}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted">Storage</p>
            <p className="num mt-1 font-semibold">{bytes(org.storage_used_bytes)} <span className="font-normal text-muted">of {bytes(tier.storage)}</span></p>
            <div className="mt-2"><Meter value={org.storage_used_bytes} max={tier.storage} label="Storage used" /></div>
          </div>
          <div>
            <p className="text-sm text-muted">Documents</p>
            <p className="num mt-1 font-semibold">{docs ?? 0} <span className="font-normal text-muted">of {tier.documents}</span></p>
            <div className="mt-2"><Meter value={docs ?? 0} max={tier.documents} label="Documents" /></div>
          </div>
          <div>
            <p className="text-sm text-muted">Applications this month</p>
            <p className="num mt-1 font-semibold">{apps ?? 0} <span className="font-normal text-muted">{tier.applications === null ? "· unlimited" : `of ${tier.applications}`}</span></p>
            {tier.applications !== null ? <div className="mt-2"><Meter value={apps ?? 0} max={tier.applications} label="Applications" /></div> : null}
          </div>
        </div>
      </section>

      <div className="mb-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Membership plans</h2>
        <p className="mt-1 text-sm text-muted">Pay by M-Pesa or card. Monthly or yearly, no auto-renewal: we remind you before it ends.</p>
      </div>
      <PlanPicker current={current} canPay={isOrgAdmin(role)} verified={org.verification_status === "verified"} until={org.plan_until ?? null} />
    </>
  );
}
