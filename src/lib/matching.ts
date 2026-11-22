// Ranks opportunities for a member company with plain rules (no AI):
//   the company's sector and chosen topics, the kinds of opportunity it wants, where it can apply, and how soon it closes.

export const INTEREST_KINDS = [
  { key: "grant", label: "Grants and funding", kinds: ["grant"] },
  { key: "tender", label: "Tenders and RFPs", kinds: ["tender", "rfp"] },
  { key: "program", label: "Programmes and accelerators", kinds: ["program"] },
  { key: "event", label: "Events and trade missions", kinds: ["event"] },
] as const;

/** Topics as tagged on opportunities (see sectorsFrom). */
export const TOPICS = ["Agriculture", "Climate & energy", "Health", "Education", "Technology", "Finance", "Creative", "Women & youth", "Social impact"] as const;

/** A company's own sector, translated to the topics opportunities are tagged with. */
const SECTOR_TOPICS: Record<string, string[]> = {
  Agriculture: ["Agriculture"], Energy: ["Climate & energy"], "Circular economy": ["Climate & energy", "Social impact"], Health: ["Health"],
  Education: ["Education"], Technology: ["Technology"], "Financial services": ["Finance"], "Branding and merchandise": ["Creative"],
  Hospitality: ["Creative"], Manufacturing: [], Trade: [], Other: [],
};

type Org = { sector?: string | null; interest_kinds?: string[] | null; interest_sectors?: string[] | null; verification_status?: string };
type Opp = { kind: string; sectors?: string[] | null; location?: string | null; deadline?: string | null; featured?: boolean | null; requires_verified?: boolean; kenya_fit?: string | null };

export function companyTopics(org: Org) {
  return [...new Set([...(SECTOR_TOPICS[org.sector ?? ""] ?? []), ...(org.interest_sectors ?? [])])];
}

/** Higher is a better fit. Reasons are short phrases shown on the card ("Matches your sector"). */
export function matchScore(o: Opp, org: Org, today = new Date().toISOString().slice(0, 10)): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const topics = companyTopics(org);
  const hit = (o.sectors ?? []).filter((t) => topics.includes(t));
  if (hit.length) { score += 4 + hit.length; reasons.push(`Matches ${hit[0].toLowerCase()}`); }
  const kinds = (org.interest_kinds ?? []).flatMap((k) => INTEREST_KINDS.find((i) => i.key === k)?.kinds ?? []) as string[];
  if (kinds.includes(o.kind)) { score += 3; reasons.push("A type you follow"); }
  if (/kenya|nairobi|east africa/i.test(o.location ?? "")) { score += 2; reasons.push("In Kenya / East Africa"); }
  if (o.featured) { score += 2; reasons.push("Recommended by Dhow"); }
  if (o.deadline) {
    const days = Math.round((new Date(o.deadline).getTime() - new Date(today).getTime()) / 864e5);
    if (days >= 0 && days <= 14) score += 1; // closing soon: worth a look now
  }
  if (o.requires_verified && org.verification_status !== "verified") score -= 1;
  return { score, reasons };
}

export function rankForCompany<T extends Opp>(opps: T[], org: Org): (T & { match: { score: number; reasons: string[] } })[] {
  return opps.map((o) => ({ ...o, match: matchScore(o, org) })).sort((a, b) => b.match.score - a.match.score || (a.deadline ?? "9").localeCompare(b.deadline ?? "9"));
}
