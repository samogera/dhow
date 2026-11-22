import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { Empty, PageHeader, Tabs } from "@/components/ui";
import { OpportunityCard, type CardOpp } from "@/components/opportunity-card";
import { cn, label } from "@/lib/format";

export const metadata: Metadata = { title: "Open opportunities" };
const KINDS = ["all", "grant", "program", "event", "tender", "rfp"] as const;
const plural = (k: string) => (k === "all" ? "All" : k === "rfp" ? "RFPs" : k === "program" ? "Programmes" : `${label(k)}s`);

export default async function Opportunities({ searchParams }: { searchParams: Promise<{ kind?: string; q?: string; sector?: string }> }) {
  const { supabase, org } = await requireMember();
  const sp = await searchParams;
  const kind = (KINDS as readonly string[]).includes(sp.kind ?? "") ? sp.kind! : "all";
  const term = (sp.q ?? "").replace(/[%_,()]/g, "").slice(0, 60);
  let q = supabase
    .from("opportunities")
    .select("id, kind, title, summary, source, url, apply_url, imported_at, location, deadline, requires_verified, image_url, benefits, sectors, featured, starts_on, ends_on")
    .eq("published", true)
    .or(`deadline.is.null,deadline.gte.${new Date().toISOString().slice(0, 10)}`)
    .order("featured", { ascending: false })
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(120);
  if (kind !== "all") q = q.eq("kind", kind);
  if (term) q = q.or(`title.ilike.%${term}%,summary.ilike.%${term}%`);
  if (sp.sector) q = q.contains("sectors", [sp.sector]);
  const { data: opps } = await q;
  const sectors = [...new Set((opps ?? []).flatMap((o) => o.sectors as string[]))].sort();
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ kind: kind === "all" ? undefined : kind, q: term || undefined, sector: sp.sector, ...patch }).filter(([, v]) => v) as [string, string][]);
    const s = p.toString();
    return `/app/opportunities${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Open opportunities" sub="Grants, programmes, tenders and events open to businesses in Kenya, checked by the Dhow team.">
        <form className="relative w-full sm:w-72">
          {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
          <input name="q" defaultValue={term} placeholder="Search opportunities" aria-label="Search opportunities" className="field rounded-full py-2.5 pl-11" />
        </form>
      </PageHeader>
      <Tabs current={qs({ sector: undefined, q: undefined })} items={KINDS.map((x) => ({ href: `/app/opportunities${x === "all" ? "" : `?kind=${x}`}`, label: plural(x) }))} />
      {sectors.length > 1 ? (
        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {sectors.map((s) => (
            <Link key={s} href={qs({ sector: sp.sector === s ? undefined : s })}
              className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition", sp.sector === s ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white text-ink/70 hover:text-ink")}>
              {s}
            </Link>
          ))}
        </div>
      ) : null}

      {opps?.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {opps.map((o) => (
            <OpportunityCard key={o.id} o={o as CardOpp} href={`/app/opportunities/${o.id}`} locked={o.requires_verified && org.verification_status !== "verified"} />
          ))}
        </div>
      ) : <Empty title={term || sp.sector ? "No matches" : "Nothing open in this category"} sub={term || sp.sector ? "Try another word or clear the filter." : "New opportunities are added every day."} />}
    </>
  );
}
