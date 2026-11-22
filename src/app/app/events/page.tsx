import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Lock, MapPin, Star } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { atLeast } from "@/lib/plans";
import { Empty, PageHeader } from "@/components/ui";
import { OpportunityCard, type CardOpp } from "@/components/opportunity-card";
import { Poster } from "@/components/poster";
import { credit } from "@/lib/opportunity-display";
import { splitTitle } from "@/lib/opportunity-parse";

export const metadata: Metadata = { title: "Events" };

type Ev = CardOpp & { venue: string | null; members_only: boolean };
const mon = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "Africa/Nairobi" });
const dd = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "Africa/Nairobi" });
const wk = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Africa/Nairobi" });

function DateTile({ d }: { d: string | null }) {
  if (!d) return <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-sunken text-xs font-semibold text-muted">TBC</div>;
  const x = new Date(d);
  return (
    <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-navy-900 text-white">
      <span className="text-[10px] font-semibold tracking-wider uppercase opacity-70">{mon.format(x)}</span>
      <span className="text-xl leading-none font-semibold">{dd.format(x)}</span>
      <span className="mt-0.5 text-[10px] opacity-70">{wk.format(x)}</span>
    </div>
  );
}

export default async function Events() {
  const { org, supabase } = await requireMember();
  const member = atLeast(org, "basic");
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("opportunities")
    .select("id, kind, title, summary, source, url, apply_url, imported_at, location, deadline, requires_verified, image_url, benefits, featured, starts_on, ends_on, venue, members_only")
    .eq("published", true).eq("kind", "event")
    .or(`ends_on.gte.${today},and(ends_on.is.null,starts_on.gte.${today}),and(ends_on.is.null,starts_on.is.null,deadline.gte.${today}),and(ends_on.is.null,starts_on.is.null,deadline.is.null)`)
    .order("starts_on", { ascending: true, nullsFirst: false })
    .limit(100);
  const events = (data ?? []) as Ev[];
  const memberEvents = events.filter((e) => e.members_only);
  const open = events.filter((e) => !e.members_only);
  const recommended = open.filter((e) => e.featured);
  const rest = open.filter((e) => !e.featured);

  return (
    <>
      <PageHeader title="Events" sub="Member events for Dhow members, and open events worth your time, picked by the Dhow team." />
      {!events.length ? (
        <Empty title="No upcoming events" sub="The Dhow team adds events here as they are announced." />
      ) : (
        <div className="space-y-10">
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Member events</h2>
                <p className="text-sm text-muted">Briefings, roundtables and visits for paying members.</p>
              </div>
              {!member ? <Link href="/app/plans" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-900"><Lock className="size-3.5" />Unlock from Basic</Link> : null}
            </div>
            {memberEvents.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {memberEvents.map((e) => <OpportunityCard key={e.id} o={e} href={`/app/opportunities/${e.id}`} />)}
              </div>
            ) : <p className="rounded-3xl border border-dashed border-line px-6 py-8 text-center text-sm text-muted">The next member events will show here.</p>}
          </section>

          <div>
            <h2 className="mb-1 text-lg font-semibold tracking-tight">Open events</h2>
            <p className="mb-5 text-sm text-muted">Public trade missions, summits and roadshows, open to any company.</p>
          {!open.length ? <p className="rounded-3xl border border-dashed border-line px-6 py-8 text-center text-sm text-muted">No open events coming up yet.</p> : null}
          <div className="space-y-8">
          {recommended.length ? (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-amber-700 uppercase"><Star className="size-4 fill-current" />Recommended by Dhow</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {recommended.map((e) => <OpportunityCard key={e.id} o={e} href={`/app/opportunities/${e.id}`} />)}
              </div>
            </section>
          ) : null}
          {rest.length ? (
            <section>
              <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted uppercase">Coming up</h2>
              <ul className="space-y-3">
                {rest.map((e) => {
                  const t = splitTitle(e.title);
                  const from = credit(e);
                  return (
                    <li key={e.id}>
                      <Link href={`/app/opportunities/${e.id}`} className="group flex items-center gap-4 rounded-[1.5rem] border border-line bg-white p-3 pr-5 transition hover:shadow-[0_12px_32px_-16px_rgba(13,28,41,0.22)]">
                        <DateTile d={e.starts_on} />
                        <Poster src={e.image_url} kind="event" className="hidden h-16 w-24 shrink-0 rounded-xl sm:block" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 font-semibold leading-snug text-navy-900 group-hover:text-navy-700">{t.headline}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                            {e.venue || e.location ? <span className="flex items-center gap-1"><MapPin className="size-3" />{e.venue ?? e.location}</span> : null}
                            <span>{from.byDhow ? "Added by the Dhow team" : `Via ${from.label}`}</span>
                          </p>
                        </div>
                        <ArrowUpRight className="size-4 shrink-0 text-faint group-hover:text-navy-600" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
          </div>
          </div>
        </div>
      )}
    </>
  );
}
