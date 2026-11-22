import type { Organization } from "@/lib/types";

// Membership, matching dhowpartners.com/apply:
//   Free        signed up, no paid plan
//   Startup     "Starter" on the website, KSh 1,000 a month
//   Growth      KSh 5,000 a month: adds investors and Growth-only opportunities
//   Enterprise  "Market Entry" on the website, custom quote: adds your work with Dhow (projects, invoices, reviews)
// Internal keys stay basic/premium; stored plan values: starter -> Startup, growth -> Growth, market_entry -> Enterprise.

export type Tier = "free" | "basic" | "premium" | "enterprise";
export type Period = "monthly" | "yearly";

const MB = 1024 * 1024;

export const TIERS: Record<Tier, {
  name: string; site: string | null; tagline: string; monthly: number | null; yearly: number | null;
  storage: number; documents: number; tracked: number | null; perks: string[];
}> = {
  free: {
    name: "Free", site: null, tagline: "Look around and start tracking.", monthly: 0, yearly: 0,
    storage: 50 * MB, documents: 10, tracked: 3,
    perks: ["Open opportunities and events", "Track 3 applications", "10 documents, 50 MB", "Help from the Dhow team"],
  },
  basic: {
    name: "Startup", site: "Starter", tagline: "For small and micro businesses.", monthly: 1000, yearly: 10000,
    storage: 500 * MB, documents: 50, tracked: 10,
    perks: ["5 curated opportunities every week", "A live Q&A every month", "Free advice calls, on a need basis", "Members-only opportunities and events", "Representation at events, at a member discount", "Track 10 applications · 50 documents, 500 MB", "5% off Dhow Partners fees"],
  },
  premium: {
    name: "Growth", site: null, tagline: "For businesses trading 2 years or more.", monthly: 5000, yearly: 50000,
    storage: 2048 * MB, documents: 200, tracked: null,
    perks: ["Everything in Startup", "Growth-only opportunities", "Introductions to vetted investors", "An investor-readiness review", "A one-on-one strategy call each quarter", "Priority and a bigger discount on event representation", "Unlimited tracking · 200 documents, 2 GB", "10% off Dhow Partners fees"],
  },
  enterprise: {
    name: "Enterprise", site: "Market Entry", tagline: "For businesses that want their full setup done for them.", monthly: null, yearly: null,
    storage: 10240 * MB, documents: 1000, tracked: null,
    perks: ["Everything in Growth", "Your full setup, coordinated for you", "One named contact from start to finish", "Vetted law, tax and accounting firms", "Review us and our partners", "A written setup plan", "Weekly check-ins until setup is done", "Your projects, invoices and progress, live"],
  },
};

export const TIER_ORDER: Tier[] = ["free", "basic", "premium", "enterprise"];
export const PAYABLE = ["basic", "premium"] as const;
export type Payable = (typeof PAYABLE)[number];
export const PLAN_FOR: Record<Payable, "starter" | "growth"> = { basic: "starter", premium: "growth" };

type OrgLike = Pick<Organization, "plan" | "verification_status"> & { plan_until?: string | null };

export function planActive(org: OrgLike) {
  return !org.plan_until || org.plan_until >= new Date().toISOString().slice(0, 10);
}

export function tierOf(org: OrgLike): Tier {
  if (!planActive(org)) return "free";
  if (org.plan === "market_entry") return "enterprise";
  if (org.plan === "growth") return "premium";
  if (org.plan === "starter") return "basic";
  return "free";
}

export const AUDIENCE: Record<string, { label: string; need: Tier }> = {
  all: { label: "Everyone", need: "free" },
  members: { label: "Members (Startup and up)", need: "basic" },
  premium: { label: "Growth and Enterprise", need: "premium" },
};

export const atLeast = (org: OrgLike, t: Tier) => TIER_ORDER.indexOf(tierOf(org)) >= TIER_ORDER.indexOf(t);

export function priceOf(tier: Tier, period: Period) {
  return period === "yearly" ? TIERS[tier].yearly : TIERS[tier].monthly;
}
