import { label } from "@/lib/format";

export const OPP_KINDS = ["grant", "program", "event", "tender", "rfp"] as const;
export const kindLabel = (k: string) => (k === "rfp" ? "RFP" : k === "program" ? "Programme" : label(k));

export interface OppLinks {
  url: string | null; apply_url: string | null; imported_at: string | null; source: string | null; source_id?: string | null;
}

/** Where to apply: the organiser's own page. For posts we imported, that's the link found in the post (never the aggregator). */
export function officialLink(o: OppLinks): string | null {
  if (o.apply_url) return o.apply_url;
  return o.imported_at ? null : o.url;
}

/** Credit for where Dhow found the opportunity. */
export function credit(o: OppLinks): { label: string; href: string | null; byDhow: boolean } {
  if (o.imported_at && o.source) return { label: o.source, href: o.url, byDhow: false };
  if (o.source && o.source !== "Dhow Partners") return { label: o.source, href: null, byDhow: false };
  return { label: "the Dhow team", href: null, byDhow: true };
}

export function hostOf(u: string | null) {
  if (!u) return null;
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; }
}

/** A plain-words line on why this kind of opportunity is worth a look, used when the team hasn't written one. */
export function defaultWhy(kind: string, benefits: string[]): string {
  const top = benefits[0] ? ` Highlights: ${benefits[0].replace(/\.$/, "")}.` : "";
  switch (kind) {
    case "grant": return `Grants and prizes are money you don't pay back and give up no shares for.${top}`;
    case "tender": return `Tenders are paid work. Winning one builds a track record that helps with the next bid.${top}`;
    case "rfp": return `A request for proposals is a buyer looking for a supplier now. A strong, early response stands out.${top}`;
    case "event": return `Events put you in the room with buyers, partners and funders you would not otherwise meet.${top}`;
    default: return `Programmes like this bring training, mentors and a network, and often lead to funding later.${top}`;
  }
}

export function eventDates(o: { starts_on: string | null; ends_on: string | null }) {
  return o.starts_on ? { start: o.starts_on, end: o.ends_on && o.ends_on !== o.starts_on ? o.ends_on : null } : null;
}
