import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Empty, PageHeader } from "@/components/ui";
import { RequestButton } from "@/components/request-button";
import { atLeast } from "@/lib/plans";
import { INVESTOR_KIND } from "@/lib/investors";
import { OpportunityTabs } from "@/components/member-nav";

export const metadata: Metadata = { title: "Investors" };

type Inv = { id: string; name: string; kind: string; about: string | null; sectors: string[]; stages: string[]; ticket: string | null; countries: string | null; website: string | null; logo_url: string | null };

export default async function Investors() {
  const { org, supabase } = await requireMember();
  const unlocked = atLeast(org, "premium");
  const [{ data }, { data: open }] = await Promise.all([
    supabase.from("investors").select("id, name, kind, about, sectors, stages, ticket, countries, website, logo_url").eq("active", true).order("name"),
    createAdminClient().from("member_requests").select("target_id").eq("org_id", org.id).eq("kind", "investor_intro").in("status", ["new", "in_progress"]),
  ]);
  const list = (data ?? []) as Inv[];
  const asked = new Set((open ?? []).map((r) => r.target_id as string));

  return (
    <>
      <PageHeader title="Investors" sub="Vetted funds, angels and lenders. Ask and the Dhow team makes a warm introduction." />
      <OpportunityTabs investors={unlocked} />
      {!unlocked ? (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-3xl bg-navy-900 px-6 py-5 text-white">
          <Lock className="size-5 shrink-0 text-mint-100" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Investor introductions come with Growth</p>
            <p className="text-sm text-white/70">Growth includes introductions to vetted investors and an investor-readiness review.</p>
          </div>
          <Link href="/app/plans" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-navy-900 hover:bg-mint-100">See plans</Link>
        </div>
      ) : null}
      {list.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => (
            <article key={i.id} className="flex flex-col gap-4 rounded-[1.75rem] bg-white p-6 ring-1 ring-line">
              <div className="flex items-center gap-3">
                {i.logo_url ? <img src={i.logo_url} alt="" className="size-12 rounded-xl bg-white object-contain ring-1 ring-line" /> : <span className="grid size-12 place-items-center rounded-xl bg-navy-50 text-lg font-semibold text-navy-700">{i.name[0]}</span>}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{i.name}</p>
                  <p className="text-xs text-muted">{INVESTOR_KIND[i.kind] ?? i.kind}</p>
                </div>
              </div>
              {i.about ? <p className="line-clamp-4 text-sm text-ink/80">{i.about}</p> : null}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {i.ticket ? <div><dt className="text-xs text-muted">Ticket size</dt><dd className="font-medium">{i.ticket}</dd></div> : null}
                {i.countries ? <div><dt className="text-xs text-muted">Invests in</dt><dd className="font-medium">{i.countries}</dd></div> : null}
              </dl>
              {i.sectors.length || i.stages.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {[...i.stages, ...i.sectors].map((x) => <span key={x} className="rounded-lg bg-sunken px-2 py-1 text-xs text-ink/75">{x}</span>)}
                </div>
              ) : null}
              <div className="mt-auto space-y-2 border-t border-line pt-4">
                {unlocked ? (
                  <RequestButton kind="investor_intro" targetId={i.id} label="Ask for an introduction" placeholder="What are you raising, and for what? (optional)" done={asked.has(i.id)} />
                ) : (
                  <Link href="/app/plans" className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted hover:text-ink"><Lock className="size-3.5" />Growth members</Link>
                )}
                {i.website ? <a href={i.website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-xs text-muted hover:text-ink">Website <ArrowUpRight className="size-3" /></a> : null}
              </div>
            </article>
          ))}
        </div>
      ) : <Empty title="Investors are being added" sub="The Dhow team is vetting the first investors. Check back soon." />}
    </>
  );
}
