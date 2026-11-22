import type { Metadata } from "next";
import { isOrgAdmin, requireMember } from "@/lib/auth";
import { confirmPaystack } from "@/lib/payments";
import { Meter, PageHeader } from "@/components/ui";
import { SettingsTabs } from "@/components/settings-tabs";
import { TIERS, tierOf } from "@/lib/plans";
import { bytes, cn, day } from "@/lib/format";
import { PlanPicker } from "./picker";
import { cancelPlan } from "@/actions/member";
import { ConfirmSubmit } from "@/components/forms";
import { loadDiscounts } from "@/lib/discounts";

export const metadata: Metadata = { title: "Membership plans" };

export default async function Plans({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  // Back from Paystack: confirm first, so the page shows the new plan.
  const paid = reference?.startsWith("DM-") ? await confirmPaystack(reference).catch(() => null) : null;
  const { org, role, supabase } = await requireMember();
  const current = tierOf(org);
  const tier = TIERS[current];
  const [{ count: docs }, { count: apps }] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("org_id", org.id).neq("status", "rejected").neq("status", "pending_upload"),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("org_id", org.id).neq("status", "withdrawn"),
  ]);
  const paidTier = current !== "free";
  const discounts = await loadDiscounts();
  const off = Object.fromEntries(Object.entries(discounts).map(([k, v]) => [k, { events: v.events_pct, services: v.services_pct }]));

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
            <p className="mt-1 text-3xl font-semibold tracking-tight">{tier.name}{tier.site ? <span className="ml-2 align-middle text-base font-normal text-muted">({tier.site})</span> : null}</p>
            <p className="mt-1 text-sm text-muted">
              {paidTier && org.plan_until ? `Paid ${org.plan_period === "yearly" ? "yearly" : "monthly"} · runs until ${day(org.plan_until)}` : paidTier ? "Set up by the Dhow team" : tier.tagline}
            </p>
          </div>

          {paidTier && isOrgAdmin(role) && org.plan_until ? (
            <form action={cancelPlan}>
              {org.plan_cancelled_at ? <input type="hidden" name="undo" value="1" /> : null}
              {org.plan_cancelled_at
                ? <button className="rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">Keep my plan</button>
                : <ConfirmSubmit variant="ghost" className="px-3 py-1.5 text-sm text-muted" message={`Cancel ${tier.name}? You keep it until ${day(org.plan_until)}, then move to Free.`}>Cancel plan</ConfirmSubmit>}
            </form>
          ) : null}
        </div>
        {org.plan_cancelled_at ? <p className="mt-3 rounded-xl bg-warn/10 px-4 py-2.5 text-sm text-warn">Cancelled. {tier.name} stays on until {day(org.plan_until)}, then you move to Free.</p> : null}
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
            <p className="text-sm text-muted">Applications tracked</p>
            <p className="num mt-1 font-semibold">{apps ?? 0} <span className="font-normal text-muted">{tier.tracked === null ? "· unlimited" : `of ${tier.tracked}`}</span></p>
            {tier.tracked !== null ? <div className="mt-2"><Meter value={apps ?? 0} max={tier.tracked} label="Applications tracked" /></div> : null}
          </div>
        </div>
      </section>

      <div className="mb-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Membership plans</h2>
        <p className="mt-1 text-sm text-muted">Pay by M-Pesa or card, monthly or yearly. No auto-renewal: we remind you before it ends.</p>
      </div>
      <PlanPicker current={current} canPay={isOrgAdmin(role)} until={org.plan_until ?? null} off={off} cancelled={Boolean(org.plan_cancelled_at)} />
    </>
  );
}
