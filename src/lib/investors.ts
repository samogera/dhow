/** Flip to true when member companies can be found by investors. Until then investor pages say membership hasn't started. */
export const MEMBERSHIP_OPEN = false;

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
  other: "Something else",
} as const;
