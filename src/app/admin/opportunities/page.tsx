import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Rss, Star } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { ButtonLink, Card, CardHeader, Empty, Field, Input, PageHeader, Select, Tabs } from "@/components/ui";
import { OpportunityCard, type CardOpp } from "@/components/opportunity-card";
import { cn, day } from "@/lib/format";
import { deleteOpportunity, importOpportunitiesNow, publishOpportunity, restoreOpportunity, saveSource, toggleFeatured, toggleSource } from "@/actions/admin";

export const metadata: Metadata = { title: "Opportunities" };

const COLS = "id, kind, title, summary, source, url, apply_url, imported_at, location, deadline, requires_verified, image_url, benefits, featured, starts_on, ends_on, published, kenya_fit, fit_reason";
type Opp = CardOpp & { kenya_fit?: string | null; fit_reason?: string | null };
const FIT: Record<string, string> = { open: "bg-mint-100 text-green", check: "bg-amber-100 text-amber-800", excluded: "bg-bad/10 text-bad" };
const FIT_LABEL: Record<string, string> = { open: "Open to Kenya", check: "Check eligibility", excluded: "Not for Kenya" };
const pill = "rounded-full px-3.5 py-1.5 text-xs font-medium transition";

function Actions({ o, review }: { o: Opp; review?: boolean }) {
  if (o.kenya_fit === "excluded") {
    return (
      <>
        <form action={restoreOpportunity}><input type="hidden" name="id" value={o.id} />
          <button className={cn(pill, "border border-line hover:bg-sunken")}>It is open to Kenya: move to review</button>
        </form>
        <Link href={`/admin/opportunities/${o.id}`} className={cn(pill, "text-muted hover:text-ink")}>Look</Link>
      </>
    );
  }
  return (
    <>
      <form action={publishOpportunity}>
        <input type="hidden" name="id" value={o.id} /><input type="hidden" name="publish" value={o.published ? "0" : "1"} />
        <button className={cn(pill, o.published ? "bg-sunken text-ink/70 hover:text-ink" : "bg-navy-900 text-white hover:bg-navy-700")}>{o.published ? "Unpublish" : "Publish"}</button>
      </form>
      <Link href={`/admin/opportunities/${o.id}`} className={cn(pill, "border border-line hover:bg-sunken")}>Edit</Link>
      <form action={toggleFeatured}>
        <input type="hidden" name="id" value={o.id} /><input type="hidden" name="value" value={o.featured ? "0" : "1"} />
        <button title="Recommended by Dhow" aria-label={o.featured ? "Remove recommendation" : "Recommend"} className={cn(pill, "flex items-center gap-1", o.featured ? "bg-amber-100 text-amber-700" : "text-muted hover:text-ink")}>
          <Star className={cn("size-3.5", o.featured && "fill-current")} />{o.featured ? "Recommended" : "Recommend"}
        </button>
      </form>
      <form action={deleteOpportunity} className="ml-auto"><input type="hidden" name="id" value={o.id} />
        <button className={cn(pill, "text-muted hover:bg-bad/10 hover:text-bad")}>{review ? "Skip" : "Remove"}</button>
      </form>
    </>
  );
}

export default async function Opportunities({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const s = await requireStaff();
  const { tab = "review" } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: all }, { data: sources }] = await Promise.all([
    s.supabase.from("opportunities").select(COLS).is("dismissed_at", null).order("created_at", { ascending: false }).limit(300),
    s.supabase.from("opportunity_sources").select("*").order("created_at"),
  ]);
  const opps = (all ?? []) as Opp[];
  const notKenya = opps.filter((o) => o.kenya_fit === "excluded");
  const review = opps.filter((o) => !o.published && o.kenya_fit !== "excluded" && (!o.deadline || o.deadline >= today))
    .sort((a, b) => (a.kenya_fit === "check" ? 0 : 1) - (b.kenya_fit === "check" ? 0 : 1));
  const live = opps.filter((o) => o.published);
  const events = opps.filter((o) => o.kind === "event" && o.kenya_fit !== "excluded");
  const list = tab === "live" ? live : tab === "events" ? events : tab === "not-kenya" ? notKenya : review;

  return (
    <>
      <PageHeader title="Opportunities" sub="Grants, programmes, tenders and events for members. New ones are imported from your sources every day.">
        <div className="flex flex-wrap gap-2">
          <ActionForm action={importOpportunitiesNow} submit="Import now" submitVariant="outline" className="flex items-center gap-3">{null}</ActionForm>
          <ButtonLink href="/admin/opportunities/new"><Plus className="size-4" />Post one</ButtonLink>
        </div>
      </PageHeader>
      <Tabs current={`/admin/opportunities?tab=${tab}`} items={[
        { href: "/admin/opportunities?tab=review", label: `To review (${review.length})` },
        { href: "/admin/opportunities?tab=live", label: `Open opportunities (${live.length})` },
        { href: "/admin/opportunities?tab=events", label: `Events (${events.length})` },
        { href: "/admin/opportunities?tab=not-kenya", label: `Not for Kenya (${notKenya.length})` },
        { href: "/admin/opportunities?tab=sources", label: `Sources (${sources?.length ?? 0})` },
      ]} />

      {tab === "sources" ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader title="Where opportunities come from" sub="Only short facts are kept, always with a link back to the original." />
            <ul className="divide-y divide-line">
              {(sources ?? []).map((src) => (
                <li key={src.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium"><Rss className="size-4 text-muted" />{src.name}</p>
                    <p className="truncate text-xs text-muted">{src.url} · {src.kind === "grants_gov" ? "Grants.gov API" : src.kind === "wordpress" ? "WordPress API" : "RSS feed"}</p>
                    <p className={cn("mt-1 text-xs", src.last_error ? "text-bad" : "text-muted")}>
                      {src.last_run_at ? `Last run ${day(src.last_run_at)}: ${src.last_error ?? `${src.last_count ?? 0} new`}` : "Not run yet"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {(["active", "auto_publish"] as const).map((f) => (
                      <form key={f} action={toggleSource}>
                        <input type="hidden" name="id" value={src.id} /><input type="hidden" name="field" value={f} /><input type="hidden" name="value" value={src[f] ? "0" : "1"} />
                        <button className={cn("rounded-full px-3 py-1.5 text-xs font-medium", src[f] ? "bg-mint-100 text-green" : "bg-sunken text-muted")}>
                          {f === "active" ? (src.active ? "On" : "Off") : src.auto_publish ? "Auto-publish" : "Review first"}
                        </button>
                      </form>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="self-start">
            <CardHeader title="Add a source" />
            <ActionForm action={saveSource} submit="Add source">
              <Field label="Name"><Input name="name" required placeholder="Opportunities for Youth" /></Field>
              <Field label="Type">
                <Select name="kind" defaultValue="wordpress">
                  <option value="wordpress">Website (WordPress)</option>
                  <option value="rss">RSS feed</option>
                  <option value="grants_gov">Grants.gov search</option>
                </Select>
              </Field>
              <Field label="Address" hint="Website home page, feed URL, or https://api.grants.gov/?keyword=Africa"><Input name="url" type="url" required placeholder="https://" /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="auto_publish" className="accent-navy-900" /> Publish automatically (skip review)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requires_verified" className="accent-navy-900" /> Verified companies only</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="members_only" className="accent-navy-900" /> Paying members only (Premium, Business)</label>
            </ActionForm>
          </Card>
        </div>
      ) : list.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {list.map((o) => (
            <OpportunityCard key={o.id} o={o} href={`/admin/opportunities/${o.id}`}
              status={tab === "review" || tab === "not-kenya"
                ? (o.kenya_fit ? <span title={o.fit_reason ?? ""} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm", FIT[o.kenya_fit])}>{tab === "not-kenya" ? o.fit_reason : FIT_LABEL[o.kenya_fit]}</span> : undefined)
                : <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm", o.published ? "bg-green text-white" : "bg-white/95 text-muted")}>{o.published ? "Live" : "Draft"}</span>}
              footer={<Actions o={o} review={tab === "review"} />} />
          ))}
        </div>
      ) : tab === "events" ? (
        <Empty title="No events yet" sub="Post an event you recommend, or one the team has noticed.">
          <ButtonLink href="/admin/opportunities/new?kind=event"><Plus className="size-4" />Add an event</ButtonLink>
        </Empty>
      ) : tab === "live" ? (
        <Empty title="No open opportunities yet" sub="Post one, or publish from the review tab." />
      ) : tab === "not-kenya" ? (
        <Empty title="Nothing set aside" sub="Opportunities limited to other countries land here, so they never go live by mistake." />
      ) : (
        <Empty title="Nothing to review" sub="Click Import now to check your sources, or wait for the next automatic import." />
      )}
    </>
  );
}
