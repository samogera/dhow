import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tier } from "@/lib/plans";

export type Discount = { tier: Tier; events_pct: number; services_pct: number; note: string | null };

export async function loadDiscounts(): Promise<Record<Tier, Discount>> {
  const { data } = await createAdminClient().from("plan_discounts").select("tier, events_pct, services_pct, note");
  const base = { events_pct: 0, services_pct: 0, note: null };
  const out = { free: { tier: "free", ...base }, basic: { tier: "basic", ...base }, premium: { tier: "premium", ...base }, enterprise: { tier: "enterprise", ...base } } as Record<Tier, Discount>;
  for (const r of data ?? []) out[r.tier as Tier] = { tier: r.tier as Tier, events_pct: Number(r.events_pct), services_pct: Number(r.services_pct), note: r.note };
  return out;
}
