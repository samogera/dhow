import type { Organization } from "@/lib/types";

// Four membership tiers. Free and Basic cost nothing: Basic comes with being Dhow Verified.
// Premium and Business are paid monthly or yearly. They map onto the stored plan values:
//   growth -> Premium, market_entry -> Business (starter is an old value, treated as Basic).

export type Tier = "free" | "basic" | "premium" | "business";
export type Period = "monthly" | "yearly";

const MB = 1024 * 1024;

export const TIERS: Record<Tier, {
  name: string; tagline: string; monthly: number | null; yearly: number | null;
  storage: number; documents: number; applications: number | null; perks: string[];
}> = {
  free: {
    name: "Free", tagline: "Get started and look around.", monthly: 0, yearly: 0,
    storage: 50 * MB, documents: 10, applications: 2,
    perks: ["Open opportunities and events", "2 applications a month", "10 documents, 50 MB", "Help from the Dhow team"],
  },
  basic: {
    name: "Basic", tagline: "Free once you're Dhow Verified.", monthly: 0, yearly: 0,
    storage: 500 * MB, documents: 50, applications: 5,
    perks: ["Everything in Free", "Dhow Verified badge", "Verified-only opportunities", "5 applications a month", "50 documents, 500 MB", "Listing in the member directory"],
  },
  premium: {
    name: "Premium", tagline: "For companies actively growing in Kenya.", monthly: 5000, yearly: 50000,
    storage: 2048 * MB, documents: 200, applications: 20,
    perks: ["Everything in Basic", "Member events and briefings", "20 applications a month", "200 documents, 2 GB", "Introductions to Dhow partners", "Priority help"],
  },
  business: {
    name: "Business", tagline: "The full Dhow service for serious market entry.", monthly: 15000, yearly: 150000,
    storage: 10240 * MB, documents: 1000, applications: null,
    perks: ["Everything in Premium", "Unlimited applications", "1,000 documents, 10 GB", "A named Dhow account lead", "KenInvest-style guidance on setting up", "Proposal reviews"],
  },
};

export const PAID: Tier[] = ["premium", "business"];
export const TIER_ORDER: Tier[] = ["free", "basic", "premium", "business"];
export const PLAN_FOR: Record<"premium" | "business", "growth" | "market_entry"> = { premium: "growth", business: "market_entry" };

type OrgLike = Pick<Organization, "plan" | "verification_status"> & { plan_until?: string | null };

export function planActive(org: OrgLike) {
  return !org.plan_until || org.plan_until >= new Date().toISOString().slice(0, 10);
}

export function tierOf(org: OrgLike): Tier {
  if (planActive(org)) {
    if (org.plan === "market_entry") return "business";
    if (org.plan === "growth") return "premium";
  }
  return org.verification_status === "verified" ? "basic" : "free";
}

export function priceOf(tier: Tier, period: Period) {
  return period === "yearly" ? TIERS[tier].yearly : TIERS[tier].monthly;
}
