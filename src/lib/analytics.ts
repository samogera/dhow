import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Row = { label: string; value: number };
export interface AnalyticsSummary {
  generated: string;
  kpis: { label: string; value: string; note: string }[];
  months: { label: string; members: number; applications: number }[];
  verification: Row[];
  plans: Row[];
  sectors: Row[];
  outcomes: Row[];
  top: { title: string; kind: string; companies: number; won: number }[];
  notApplied: { name: string; joined: string; verification: string }[];
}

const PLAN: Record<string, string> = { free: "Free", starter: "Starter", growth: "Growth", market_entry: "Market Entry" };
const VER: Record<string, string> = { verified: "Verified", pending: "In review", unverified: "Not verified", rejected: "Rejected", expired: "Expired" };
const cap = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const kind = (k: string) => (k === "rfp" ? "RFP" : k === "program" ? "Programme" : cap(k));
const dfmt = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });

function tally(xs: (string | null)[], map?: Record<string, string>): Row[] {
  const m = new Map<string, number>();
  for (const x of xs) { const k = x ? map?.[x] ?? x : "Not given"; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
}

/** The same figures as the Analytics page, shaped for a report. */
export async function analyticsSummary(db: SupabaseClient): Promise<AnalyticsSummary> {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: orgs }, { data: apps }, { data: opps }] = await Promise.all([
    db.from("organizations").select("id, name, created_at, verification_status, plan, sector").limit(5000),
    db.from("applications").select("org_id, opportunity_id, status, submitted_at").neq("status", "draft").limit(10000),
    db.from("opportunities").select("id, title, kind, published, deadline, imported_at, dismissed_at").limit(3000),
  ]);
  const O = orgs ?? [], A = apps ?? [], P = opps ?? [];
  const applied = new Set(A.map((a) => a.org_id));
  const live = P.filter((p) => p.published && !p.dismissed_at && (!p.deadline || p.deadline >= today));
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "0%");
  const verified = O.filter((o) => o.verification_status === "verified").length;

  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
    const key = d.toISOString().slice(0, 7);
    return {
      label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }),
      members: O.filter((o) => o.created_at.startsWith(key)).length,
      applications: A.filter((a) => a.submitted_at?.startsWith(key)).length,
    };
  });

  const byOpp = new Map<string, { orgs: Set<string>; won: number }>();
  for (const a of A) {
    const e = byOpp.get(a.opportunity_id) ?? { orgs: new Set<string>(), won: 0 };
    e.orgs.add(a.org_id); if (a.status === "won") e.won++;
    byOpp.set(a.opportunity_id, e);
  }

  return {
    generated: dfmt(new Date().toISOString()),
    kpis: [
      { label: "Companies", value: String(O.length), note: `${months.at(-1)?.members ?? 0} joined this month` },
      { label: "Verified", value: String(verified), note: `${pct(verified, O.length)} of members` },
      { label: "Applied to something", value: String(applied.size), note: `${O.length - applied.size} not yet` },
      { label: "Applications", value: String(A.length), note: `${A.filter((a) => a.status === "won").length} won` },
      { label: "Paid plans", value: String(O.filter((o) => o.plan !== "free").length), note: `${O.filter((o) => o.plan === "free").length} on Free` },
      { label: "Live opportunities", value: String(live.length), note: `${live.filter((p) => p.kind === "event").length} events` },
    ],
    months,
    verification: tally(O.map((o) => o.verification_status), VER),
    plans: tally(O.map((o) => o.plan), PLAN),
    sectors: tally(O.map((o) => o.sector)).slice(0, 8),
    outcomes: tally(A.map((a) => a.status)).map((r) => ({ ...r, label: cap(r.label) })),
    top: [...byOpp.entries()].sort((a, b) => b[1].orgs.size - a[1].orgs.size).slice(0, 10).map(([id, e]) => {
      const o = P.find((p) => p.id === id);
      return { title: o?.title ?? "Removed opportunity", kind: o ? kind(o.kind) : "", companies: e.orgs.size, won: e.won };
    }),
    notApplied: O.filter((o) => !applied.has(o.id)).sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((o) => ({ name: o.name, joined: dfmt(o.created_at), verification: VER[o.verification_status] ?? o.verification_status })),
  };
}
