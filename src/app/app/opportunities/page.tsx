import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin, Search, Sparkles } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { Empty, PageHeader, Tabs } from "@/components/ui";
import { Poster } from "@/components/poster";
import { cn, day, daysUntil, label } from "@/lib/format";

export const metadata: Metadata = { title: "Opportunities" };
const KINDS = ["all", "grant", "program", "event", "tender", "rfp"] as const;
const kindLabel = (k: string) => (k === "rfp" ? "RFP" : label(k));
const plural = (k: string) => (k === "all" ? "All" : k === "rfp" ? "RFPs" : `${label(k)}s`);

export default async function Opportunities({ searchParams }: { searchParams: Promise<{ kind?: string; q?: string; sector?: string }> }) {
  const { supabase, org } = await requireMember();
  const sp = await searchParams;
  const kind = (KINDS as readonly string[]).includes(sp.kind ?? "") ? sp.kind! : "all";
  const term = (sp.q ?? "").replace(/[%_,()]/g, "").slice(0, 60);
  let q = supabase
    .from("opportunities")
    .select("id, kind, title, summary, source, location, deadline, requires_verified, image_url, benefits, sectors")
    .eq("published", true)
    .or(`deadline.is.null,deadline.gte.${new Date().toISOString().slice(0, 10)}`)
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
      <PageHeader title="Opportunities" sub="Grants, programmes, tenders and events for African businesses. Updated every day.">
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {opps.map((o) => {
            const left = o.deadline ? daysUntil(o.deadline) : null;
            const locked = o.requires_verified && org.verification_status !== "verified";
            return (
              <Link key={o.id} href={`/app/opportunities/${o.id}`} className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(13,28,41,0.18)]">
                <div className="relative">
                  <Poster src={o.image_url} kind={o.kind} className="aspect-[16/9]" />
                  <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-navy-900 shadow-sm">{kindLabel(o.kind)}</span>
                  {left !== null ? (
                    <span className={cn("absolute top-3 right-3 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm", left <= 7 ? "bg-bad text-white" : "bg-white/95 text-ink")}>
                      {left === 0 ? "Closes today" : `${left} day${left === 1 ? "" : "s"} left`}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <p className="line-clamp-3 font-semibold leading-snug group-hover:text-navy-700">{o.title}</p>
                  {o.benefits?.[0] ? (
                    <p className="flex gap-2 rounded-2xl bg-amber-100 px-3 py-2 text-xs text-ink/80"><Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-700" /><span className="line-clamp-2">{o.benefits[0]}</span></p>
                  ) : o.summary ? <p className="line-clamp-2 text-sm text-muted">{o.summary}</p> : null}
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted">
                    {o.source ? <span className="font-medium text-ink/70">{o.source}</span> : null}
                    {o.location ? <span className="flex items-center gap-1"><MapPin className="size-3" />{o.location}</span> : null}
                    {o.deadline ? <span>Closes {day(o.deadline)}</span> : <span>Rolling</span>}
                    {o.requires_verified ? <span className={cn("flex items-center gap-1 font-medium", locked ? "text-amber-700" : "text-green")}><BadgeCheck className="size-3.5" />Verified only</span> : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : <Empty title={term || sp.sector ? "No matches" : "Nothing open in this category"} sub={term || sp.sector ? "Try another word or clear the filter." : "New opportunities are added every day."} />}
    </>
  );
}
