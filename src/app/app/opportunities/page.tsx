import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { Badge, Empty, PageHeader, Tabs } from "@/components/ui";
import { day, daysUntil, label } from "@/lib/format";

export const metadata: Metadata = { title: "Opportunities" };
const KINDS = ["all", "rfp", "tender", "grant", "event", "program"] as const;

export default async function Opportunities({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { supabase } = await requireMember();
  const { kind: k } = await searchParams;
  const kind = (KINDS as readonly string[]).includes(k ?? "") ? k! : "all";
  let q = supabase
    .from("opportunities")
    .select("id, kind, title, summary, source, location, deadline, requires_verified")
    .eq("published", true)
    .or(`deadline.is.null,deadline.gte.${new Date().toISOString().slice(0, 10)}`)
    .order("deadline", { ascending: true, nullsFirst: false });
  if (kind !== "all") q = q.eq("kind", kind);
  const { data: opps } = await q;

  return (
    <>
      <PageHeader title="Opportunities" sub="Curated RFPs, tenders, grants and events from KenInvest, KNCCI, embassies and our partners." />
      <Tabs current={`/app/opportunities${kind === "all" ? "" : `?kind=${kind}`}`}
        items={KINDS.map((x) => ({ href: `/app/opportunities${x === "all" ? "" : `?kind=${x}`}`, label: x === "all" ? "All" : x === "rfp" ? "RFPs" : `${label(x)}s` }))} />
      {opps?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {opps.map((o) => (
            <Link key={o.id} href={`/app/opportunities/${o.id}`} className="card group flex flex-col gap-4 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
              <div className="flex items-center justify-between">
                <Badge tone="info">{o.kind === "rfp" ? "RFP" : label(o.kind)}</Badge>
                <ArrowUpRight className="size-5 text-muted transition group-hover:text-ink" />
              </div>
              <div className="flex-1">
                <p className="text-lg leading-snug font-semibold">{o.title}</p>
                <p className="mt-2 line-clamp-3 text-sm text-muted">{o.summary}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                {o.source ? <span>{o.source}</span> : null}
                {o.location ? <span className="flex items-center gap-1"><MapPin className="size-3" />{o.location}</span> : null}
                {o.requires_verified ? <Badge tone="lime">Verified only</Badge> : null}
              </div>
              {o.deadline ? (
                <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
                  <span className="text-muted">Closes {day(o.deadline)}</span>
                  <span className={daysUntil(o.deadline) <= 7 ? "font-medium text-bad" : "font-medium"}>{daysUntil(o.deadline)} days left</span>
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      ) : <Empty title="Nothing open in this category" sub="We add new opportunities every week and email members when they match." />}
    </>
  );
}
