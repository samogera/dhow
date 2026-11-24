import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, Building2, CalendarDays, Globe2, Landmark, MapPin, Sprout, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { INVESTOR_KIND } from "@/lib/investors";
import { createAdminClient } from "@/lib/supabase/admin";
import { shareMeta } from "@/lib/share-meta";
import { VerifiedTick } from "@/components/verified-tick";
import { cn, day } from "@/lib/format";
import { InvestorChoice } from "./choice";
import { InvestorProfile } from "./profile";

const valid = (t: string) => /^[A-Za-z0-9_-]{24,64}$/.test(t);

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const { data: i } = valid(token) ? await createAdminClient().from("investors").select("name").eq("portal_token", token).maybeSingle() : { data: null };
  return shareMeta(i ? `${i.name} · Companies for you from Dhow Partners` : "Companies for you · Dhow Partners",
    "Verified companies in Kenya, picked for you by Dhow Partners. Say who you'd like to meet and we'll make the introduction.", `/investor/${token}`);
}

type Co = {
  id: string; name: string; logo_url: string | null; sector: string | null; country: string | null; tagline: string | null; about: string | null;
  founded_year: number | null; team_size: string | null; verification_status: string; website: string | null; interest_sectors?: string[] | null;
};
const CO = "id, name, logo_url, sector, country, tagline, about, founded_year, team_size, verification_status, website, interest_sectors";

function FocusLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60"><Icon className="size-3.5 text-mint" />{children}</p>;
}

function CompanyCard({ c, token, current, note, asked }: { c: Co; token: string; current?: "interested" | "not_now" | null; note?: string | null; asked?: string | null }) {
  const initials = c.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <article className={cn("flex flex-col gap-4 rounded-[1.5rem] bg-white p-5 ring-1 transition sm:p-6", current === "interested" ? "ring-2 ring-green/50" : "ring-line")}>
      <div className="flex items-start gap-3">
        {c.logo_url ? <img src={c.logo_url} alt="" className="size-12 shrink-0 rounded-xl bg-white object-contain ring-1 ring-line" />
          : <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-navy-50 font-semibold text-navy-700">{initials}</span>}
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 font-semibold text-navy-900"><span className="truncate">{c.name}</span>{c.verification_status === "verified" ? <VerifiedTick label={false} /> : null}</h3>
          <p className="truncate text-sm text-muted">{[c.sector, c.country].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      {c.tagline || c.about ? <p className="line-clamp-4 text-sm text-ink/80">{c.tagline || c.about}</p> : null}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {c.founded_year ? <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />Since {c.founded_year}</span> : null}
        {c.team_size ? <span className="flex items-center gap-1"><Users className="size-3.5" />{c.team_size} people</span> : null}
        {c.country ? <span className="flex items-center gap-1"><MapPin className="size-3.5" />{c.country}</span> : null}
        {c.website ? <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="text-navy-600 hover:underline">Website ↗</a> : null}
      </div>
      {note ? <p className="rounded-xl bg-mint-100/70 px-3.5 py-2.5 text-sm text-ink/85"><span className="font-medium text-green">Their note{asked ? ` · ${asked}` : ""}: </span>{note}</p> : null}
      <div className="mt-auto border-t border-line pt-4"><InvestorChoice token={token} orgId={c.id} current={current} /></div>
    </article>
  );
}

export default async function InvestorPortal({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ sector?: string }> }) {
  const { token } = await params;
  const { sector } = await searchParams;
  if (!valid(token)) notFound();
  const db = createAdminClient();
  const { data: inv } = await db.from("investors").select("id, name, kind, sectors, stages, ticket, countries, logo_url, contact_name, email, about, website, active, deletion_requested_at").eq("portal_token", token).maybeSingle();
  if (!inv) notFound();
  if (inv.deletion_requested_at || !inv.active) {
    return (
      <main className="mx-auto max-w-lg px-5 py-24 text-center">
        <img src="/brand/wordmark-navy.png" alt="Dhow Partners" className="mx-auto h-6 w-auto" />
        <h1 className="mt-10 text-2xl font-semibold tracking-tight">{inv.deletion_requested_at ? "Your profile is being deleted" : "This page is paused"}</h1>
        <p className="mt-2 text-sm text-muted">{inv.deletion_requested_at ? "We received your request and will delete your profile within 30 days. Changed your mind? Email hello@dhowpartners.com." : "Dhow Partners has paused this page. Email hello@dhowpartners.com if you'd like it back."}</p>
      </main>
    );
  }

  const [{ data: asks }, { data: listed }, { data: answers }] = await Promise.all([
    db.from("member_requests").select(`note, created_at, organizations(${CO})`).eq("kind", "investor_intro").eq("target_id", inv.id).neq("status", "declined").order("created_at", { ascending: false }),
    db.from("organizations").select(CO).eq("listed", true).eq("verification_status", "verified").order("name").limit(300),
    db.from("investor_interest").select("org_id, response").eq("investor_id", inv.id),
  ]);
  const answer = new Map((answers ?? []).map((a) => [a.org_id as string, a.response as "interested" | "not_now"]));
  const asked = ((asks ?? []) as unknown as { note: string | null; created_at: string; organizations: Co | null }[]).filter((a) => a.organizations);
  const askedIds = new Set(asked.map((a) => a.organizations!.id));
  const wants = ((inv.sectors as string[]) ?? []).map((s) => s.toLowerCase());
  const fits = (c: Co) => !wants.length || wants.some((w) => [c.sector, ...(c.interest_sectors ?? [])].some((x) => x?.toLowerCase().includes(w) || (x && w.includes(x.toLowerCase()))));
  const others = ((listed ?? []) as Co[]).filter((c) => !askedIds.has(c.id));
  const sectors = [...new Set(others.map((c) => c.sector).filter(Boolean))].sort() as string[];
  const shown = others.filter((c) => (!sector || c.sector === sector)).sort((a, b) => Number(fits(b)) - Number(fits(a)));
  const interested = [...answer.values()].filter((v) => v === "interested").length;
  const sectorList = ((inv.sectors as string[]) ?? []).filter(Boolean);
  const stageList = ((inv.stages as string[]) ?? []).filter(Boolean);
  const countryList = (inv.countries ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
  const kind = inv.kind ? INVESTOR_KIND[inv.kind] ?? null : null;
  const hasFocus = Boolean(inv.ticket || kind || sectorList.length || stageList.length || countryList.length);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-7">
        <img src="/brand/wordmark-navy.png" alt="Dhow Partners" className="h-6 w-auto" />
        <a href="mailto:hello@dhowpartners.com" className="text-sm font-medium text-navy-600">Contact us</a>
      </header>
      <main className="mx-auto max-w-6xl space-y-10 px-5 py-10">
        <section className="relative overflow-hidden rounded-[2rem] bg-navy-900 px-6 py-8 text-white sm:px-10 sm:py-10">
          <span aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-mint/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-white/70">Prepared for {inv.contact_name ? `${inv.contact_name}, ` : ""}{inv.name}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Companies you may want to meet</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/75">Verified businesses in Kenya, from the Dhow Partners network. Tap <b>I&apos;m interested</b> and we&apos;ll make a warm introduction. Contact details are shared once both sides agree.</p>
            </div>
            <div className="flex gap-6 text-sm">
              <div><p className="text-3xl font-semibold">{asked.length}</p><p className="text-white/70">asked for you</p></div>
              <div><p className="text-3xl font-semibold">{interested}</p><p className="text-white/70">you liked</p></div>
            </div>
          </div>
          {hasFocus ? (
            <div className="relative mt-8 flex flex-col gap-px overflow-hidden rounded-[1.5rem] bg-white/15 ring-1 ring-white/15 lg:flex-row">
              {inv.ticket || kind ? (
                <div className="bg-navy-900/95 p-5 lg:flex-[1.1]">
                  <FocusLabel icon={Banknote}>Ticket size</FocusLabel>
                  {inv.ticket ? <p className="mt-2 text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl">{inv.ticket}</p> : <p className="mt-2 text-sm text-white/60">Discussed per deal</p>}
                  {kind ? <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber/15 px-2.5 py-0.5 text-[11px] font-medium text-amber ring-1 ring-amber/30"><Landmark className="size-3" />{kind}</p> : null}
                </div>
              ) : null}
              {sectorList.length ? (
                <div className="bg-navy-900/95 p-5 lg:flex-[2]">
                  <FocusLabel icon={Sprout}>Sectors <span className="text-white/40">· {sectorList.length}</span></FocusLabel>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {sectorList.map((s) => <span key={s} className="rounded-lg bg-mint/15 px-2.5 py-1 text-xs font-medium text-mint-100 ring-1 ring-mint/30">{s}</span>)}
                  </div>
                </div>
              ) : null}
              {stageList.length ? (
                <div className="bg-navy-900/95 p-5 lg:flex-[1.3]">
                  <FocusLabel icon={TrendingUp}>Stages supported</FocusLabel>
                  <ol className="mt-3 space-y-1.5">
                    {stageList.map((s, n) => (
                      <li key={s} className="flex items-center gap-2.5 text-sm text-white/90">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white text-[10px] font-semibold text-navy-900">{n + 1}</span>{s}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {countryList.length ? (
                <div className="bg-navy-900/95 p-5 lg:flex-[0.9]">
                  <FocusLabel icon={Globe2}>Countries</FocusLabel>
                  <ul className="mt-3 space-y-1.5">
                    {countryList.map((c) => <li key={c} className="flex items-center gap-2 text-sm text-white/90"><MapPin className="size-3.5 text-mint" />{c}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <InvestorProfile token={token} p={{ name: inv.name, contact_name: inv.contact_name, email: inv.email, about: inv.about, ticket: inv.ticket, countries: inv.countries, website: inv.website, sectors: (inv.sectors as string[]) ?? [], stages: (inv.stages as string[]) ?? [], logo_url: inv.logo_url }} />

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Asked to meet you</h2>
          <p className="mt-1 text-sm text-muted">These companies asked Dhow Partners for an introduction to {inv.name}.</p>
          {asked.length ? (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {asked.map((a) => <CompanyCard key={a.organizations!.id} c={a.organizations!} token={token} current={answer.get(a.organizations!.id)} note={a.note} asked={day(a.created_at)} />)}
            </div>
          ) : <p className="mt-5 rounded-[1.5rem] border border-dashed border-line px-6 py-8 text-center text-sm text-muted">No requests yet. When a company asks to meet you, it shows here{inv.email ? " and we email you" : ""}.</p>}
        </section>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Verified companies{wants.length ? " in your sectors first" : ""}</h2>
              <p className="mt-1 text-sm text-muted">Businesses that are Dhow Verified and chose to be found.</p>
            </div>
          </div>
          {sectors.length > 1 ? (
            <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
              <Link href={`/investor/${token}`} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium", !sector ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white text-ink/70")}>All</Link>
              {sectors.map((s) => (
                <Link key={s} href={`/investor/${token}?sector=${encodeURIComponent(s)}`} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium", sector === s ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white text-ink/70")}>{s}</Link>
              ))}
            </div>
          ) : null}
          {shown.length ? (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shown.map((c) => <CompanyCard key={c.id} c={c} token={token} current={answer.get(c.id)} />)}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-line px-6 py-10 text-center">
              <Building2 className="mx-auto size-6 text-faint" />
              <p className="mt-2 text-sm text-muted">New verified companies join every week. Check back soon.</p>
            </div>
          )}
        </section>
      </main>
      <footer className="pb-10 text-center text-xs text-faint">Dhow Partners · Nairobi, Kenya · This page is private to {inv.name}. Please don&apos;t share it.</footer>
    </div>
  );
}
