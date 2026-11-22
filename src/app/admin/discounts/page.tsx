import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { saveDiscounts } from "@/actions/investors";
import { loadDiscounts } from "@/lib/discounts";
import { TIERS, TIER_ORDER } from "@/lib/plans";

export const metadata: Metadata = { title: "Discounts" };

export default async function Discounts() {
  await requireStaff();
  const d = await loadDiscounts();
  return (
    <>
      <PageHeader title="Discounts" sub="What each plan saves on event representation and on Dhow services. Members see their own discount." />
      <Card>
        <ActionForm action={saveDiscounts} submit="Save discounts" className="space-y-4">
          <div className="hidden grid-cols-[10rem_1fr_1fr_2fr] gap-3 text-xs font-medium tracking-wide text-muted uppercase sm:grid">
            <span>Plan</span><span>Event representation</span><span>Dhow services</span><span>Note shown to members</span>
          </div>
          {TIER_ORDER.map((t) => (
            <div key={t} className="grid grid-cols-2 items-center gap-3 border-t border-line pt-4 sm:grid-cols-[10rem_1fr_1fr_2fr] sm:border-0 sm:pt-0">
              <p className="col-span-2 font-semibold sm:col-span-1">{TIERS[t].name}</p>
              <label className="flex items-center gap-2 text-sm"><input name={`${t}_events`} type="number" min="0" max="100" step="0.5" defaultValue={d[t].events_pct} className="field w-24" aria-label={`${TIERS[t].name} event discount`} />% off</label>
              <label className="flex items-center gap-2 text-sm"><input name={`${t}_services`} type="number" min="0" max="100" step="0.5" defaultValue={d[t].services_pct} className="field w-24" aria-label={`${TIERS[t].name} services discount`} />% off</label>
              <input name={`${t}_note`} defaultValue={d[t].note ?? ""} placeholder="e.g. Not on partner fees" className="field col-span-2 sm:col-span-1" aria-label={`${TIERS[t].name} note`} />
            </div>
          ))}
        </ActionForm>
      </Card>
    </>
  );
}
