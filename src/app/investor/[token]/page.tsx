import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, Building2, Clock3, CalendarDays, Globe2, MapPin, Sprout, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { INVESTOR_KIND, membershipOpen, membershipOpensAt } from "@/lib/investors";
import { InvestorNotifications } from "./notifications";
import type { InvestorNotice } from "@/actions/investor-portal";
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
  return <span className="flex items-center gap-1.5 text-xs font-medium text-muted"><Icon className="size-3.5 text-green" />{children}</span>;
}

function CompanyCard({ c, token, current, note, asked }: { c: Co; token: string; current?: "interested" | "not_now" | null; note?: string | null; asked?: string | null }) {
  const initials = c.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <article className={cn("flex flex-col gap-4 rounded-[1.5rem] bg-white p-4 ring-1 transition sm:p-6", current === "interested" ? "ring-2 ring-green/50" : "ring-line")}>
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
  const { data: inv } = await db.from("investors").select("id, name, kind, sectors, stages, ticket, countries, instruments, contact_role, logo_url, contact_name, email, about, website, active, deletion_requested_at").eq("portal_token", token).maybeSingle();
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

  const [{ data: asks }, { data: listed }, { data: answers }, { data: settings }, { data: feed }] = await Promise.all([
    db.from("member_requests").select(`note, created_at, organizations(${CO})`).eq("kind", "investor_intro").eq("target_id", inv.id).neq("status", "declined").order("created_at", { ascending: false }),
    db.from("organizations").select(CO).eq("listed", true).eq("verification_status", "verified").order("name").limit(300),
    db.from("investor_interest").select("org_id, response").eq("investor_id", inv.id),
    db.from("investor_settings").select("phone, alert_new_request, alert_intro_update, alert_new_companies").eq("investor_id", inv.id).maybeSingle(),
    db.from("investor_notifications").select("id, kind, title, body, emailed, read_at, created_at").eq("investor_id", inv.id).order("created_at", { ascending: false }).limit(50),
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
  const countryList: string[] = String(inv.countries ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
  const kind = inv.kind ? INVESTOR_KIND[inv.kind] ?? null : null;
  const instrumentList = ((inv.instruments as string[] | null) ?? []).filter(Boolean);
  const isOpen = membershipOpen();
  const opensAt = membershipOpensAt();
  const opensLabel = opensAt ? opensAt.toLocaleString("en-GB", { timeZone: "Africa/Nairobi", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }) : null;
  const daysLeft = opensAt ? Math.max(0, Math.ceil((opensAt.getTime() - Date.now()) / 86_400_000)) : null;
  const hasFocus = Boolean(inv.ticket || kind || sectorList.length || stageList.length || countryList.length);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-5 sm:px-5 sm:pt-7">
        <img src="/brand/wordmark-navy.png" alt="Dhow Partners" className="h-5 w-auto sm:h-6" />
        <Link href={`/investor/${token}/contact`} className="shrink-0 rounded-xl bg-navy-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy-800 sm:px-4">Contact us</Link>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:space-y-10 sm:px-5 sm:py-10">
        <section className="overflow-hidden rounded-[1.5rem] bg-white sm:rounded-[2rem] shadow-[0_1px_2px_rgba(2,34,58,0.05),0_30px_60px_-30px_rgba(2,34,58,0.25)] ring-1 ring-line">
          <div className="relative bg-navy-950 px-5 pt-6 pb-8 text-white sm:px-12 sm:pt-10 sm:pb-12">
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_90%_at_100%_0%,rgba(99,184,168,0.16),transparent_65%)]" />
            <div className="relative flex items-center gap-3">
              {inv.logo_url ? <span className="grid size-10 place-items-center rounded-xl bg-white p-1.5"><img src={inv.logo_url} alt="" className="max-h-full max-w-full object-contain" /></span> : null}
              <div className="leading-tight">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">Prepared for</p>
                <p className="mt-0.5 text-[15px] font-medium text-white">{inv.name}</p>
              </div>
            </div>
            <div className="relative mt-8 grid gap-6 sm:mt-10 sm:gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h1 className="max-w-2xl text-[1.85rem] leading-[1.1] font-semibold tracking-[-0.025em] sm:text-5xl">Companies you may want to meet</h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60 sm:mt-4 sm:text-[15px]">Verified businesses from the Dhow Partners network, matched to your mandate. Say you&apos;re interested and we&apos;ll make a warm introduction. Contact details are shared only when both sides agree.</p>
              </div>
              <dl className="grid w-full grid-cols-2 divide-x sm:flex sm:w-fit divide-white/10 rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
                <div className="px-4 py-3.5 sm:px-6 sm:py-4"><dt className="text-xs text-white/50">Asked to meet you</dt><dd className="mt-1 text-3xl font-semibold tabular-nums">{asked.length}</dd></div>
                <div className="px-4 py-3.5 sm:px-6 sm:py-4"><dt className="text-xs text-white/50">You&apos;re interested in</dt><dd className="mt-1 text-3xl font-semibold tabular-nums">{interested}</dd></div>
              </dl>
            </div>
          </div>

          {hasFocus ? (
            <div className="px-5 py-6 sm:px-12 sm:py-9">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">Your mandate</p>
              <dl className="mt-4 grid divide-y divide-line sm:mt-6 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-8 sm:divide-y-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.7fr)_minmax(0,1.2fr)_minmax(0,0.7fr)]">
                {inv.ticket || kind || instrumentList.length ? (
                  <div className="py-4 first:pt-0 last:pb-0 sm:py-0">
                    <dt><FocusLabel icon={Banknote}>Ticket size</FocusLabel></dt>
                    <dd className="mt-2 text-xl leading-tight sm:mt-3 sm:text-2xl font-semibold tracking-tight text-navy-900 tabular-nums">{inv.ticket ?? "Per deal"}</dd>
                    {kind || instrumentList.length ? <dd className="mt-2 text-sm text-muted">{[kind, ...instrumentList].filter(Boolean).join(" · ")}</dd> : null}
                  </div>
                ) : null}
                {sectorList.length ? (
                  <div className="py-4 first:pt-0 last:pb-0 sm:py-0">
                    <dt><FocusLabel icon={Sprout}>Sectors</FocusLabel></dt>
                    <dd className="mt-3 flex flex-wrap gap-1.5">
                      {sectorList.map((s) => <span key={s} className="rounded-full border border-line bg-canvas px-3 py-1 text-[13px] text-ink/85">{s}</span>)}
                    </dd>
                  </div>
                ) : null}
                {stageList.length ? (
                  <div className="py-4 first:pt-0 last:pb-0 sm:py-0">
                    <dt><FocusLabel icon={TrendingUp}>Stages we support</FocusLabel></dt>
                    <dd className="mt-3">
                      <ol className="relative space-y-2.5 before:absolute before:top-2 before:bottom-2 before:left-[3px] before:w-px before:bg-line">
                        {stageList.map((s) => <li key={s} className="relative flex items-center gap-3 text-sm text-ink/85"><span className="size-[7px] shrink-0 rounded-full bg-green ring-4 ring-white" />{s}</li>)}
                      </ol>
                    </dd>
                  </div>
                ) : null}
                {countryList.length ? (
                  <div className="py-4 first:pt-0 last:pb-0 sm:py-0">
                    <dt><FocusLabel icon={Globe2}>Countries</FocusLabel></dt>
                    <dd className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink/85 sm:block sm:space-y-2">{countryList.map((c) => <p key={c}>{c}</p>)}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
        </section>

        <InvestorNotifications token={token} initial={(feed ?? []) as InvestorNotice[]} email={inv.email} />

        <InvestorProfile token={token} p={{ name: inv.name, kind: inv.kind, contact_role: inv.contact_role, instruments: instrumentList, phone: settings?.phone ?? null,
          alerts: { alert_new_request: settings?.alert_new_request ?? true, alert_intro_update: settings?.alert_intro_update ?? true, alert_new_companies: settings?.alert_new_companies ?? true },
          contact_name: inv.contact_name, email: inv.email, about: inv.about, ticket: inv.ticket, countries: inv.countries, website: inv.website, sectors: (inv.sectors as string[]) ?? [], stages: (inv.stages as string[]) ?? [], logo_url: inv.logo_url }} />

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
          {!isOpen ? (
            <div className="mt-5 flex flex-col items-start gap-4 rounded-[1.5rem] bg-mint-100/60 p-5 ring-1 ring-mint/30 sm:flex-row sm:items-center sm:p-7">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-green ring-1 ring-mint/40"><Clock3 className="size-5" /></span>
              <div className="flex-1">
                <p className="font-semibold text-navy-900">{opensLabel ? `Membership opens ${opensLabel}` : "Membership hasn't started yet"}</p>
                <p className="mt-1 text-sm text-ink/75">We&apos;re verifying the first member companies now. {opensLabel ? `In ${daysLeft === 1 ? "1 day" : `${daysLeft} days`}, companies` : "When membership opens, companies"} that chose to be found will appear here, in your sectors first{settings?.alert_new_companies === false ? "" : ", and we'll let you know"}.</p>
              </div>
              <Link href={`/investor/${token}/contact?topic=pipeline`} className="w-full shrink-0 rounded-xl border border-line bg-white px-4 py-2.5 text-center text-sm font-medium hover:bg-sunken sm:w-auto sm:py-2">Ask about the pipeline</Link>
            </div>
          ) : (<>
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
          </>)}
        </section>
      </main>
      <footer className="px-5 pb-10 text-center text-xs text-faint">Dhow Partners · Nairobi, Kenya · This page is private to {inv.name}. Please don&apos;t share it.</footer>
    </div>
  );
}
