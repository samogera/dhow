/**
 * When investors start seeing member companies. Set MEMBERSHIP_OPENS_AT in Vercel (or here),
 * e.g. "2027-01-15T09:00:00+03:00". Pages switch over by themselves at that moment. Empty = not scheduled yet.
 */
const OPENS_AT_DEFAULT = "";
export function membershipOpensAt(): Date | null {
  const raw = (process.env.MEMBERSHIP_OPENS_AT ?? OPENS_AT_DEFAULT).trim();
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(t) ? null : new Date(t);
}
export function membershipOpen(now = Date.now()) {
  const at = membershipOpensAt();
  return Boolean(at && now >= at.getTime());
}

export const INSTRUMENT_HINT = "Equity, Debt, Revenue-based, Grant";

export const INVESTOR_KIND: Record<string, string> = {
  fund: "Investment fund", angel: "Angel network", bank: "Bank or lender", dfi: "Development finance", corporate: "Corporate investor", grant: "Grant maker",
};

/** What an investor can write to us about, from their private page. */
export const CONTACT_TOPICS = {
  pipeline: "When companies will be ready to meet",
  company: "A question about a company",
  intro: "Help with an introduction",
  focus: "Updating what we invest in",
  partner: "Partnering or co-investing with Dhow",
  call: "Booking a call with the team",
  problem: "Something isn't working on this page",
  other: "Other",
} as const;
