import Link from "next/link";
import { ArrowRight, BadgeCheck, Briefcase, Building2, CalendarDays, Check, FileText, Send, ShieldAlert } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, StatusBadge } from "@/components/ui";
import { OpportunityCard, type CardOpp } from "@/components/opportunity-card";
import { cn, day } from "@/lib/format";
import { rankForCompany } from "@/lib/matching";
import { HelpForm } from "@/components/help-form";
import { VerifiedTick } from "@/components/verified-tick";
import { AUDIENCE, atLeast } from "@/lib/plans";

const OPP_COLS = "id, kind, title, summary, source, url, apply_url, imported_at, location, deadline, requires_verified, image_url, benefits, featured, starts_on, ends_on, sectors, audience";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Nairobi" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function Dashboard() {
  const { org, profile, user, supabase } = await requireMember();
  const today = new Date().toISOString().slice(0, 10);
  const [{ count: docCount }, { data: opps }, { data: events }, { data: apps }, { data: dhow }] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("org_id", org.id).in("status", ["uploaded", "approved"]),
    supabase.from("opportunities").select(OPP_COLS).eq("published", true).neq("kind", "event").or(`deadline.is.null,deadline.gte.${today}`)
      .order("featured", { ascending: false }).order("deadline", { ascending: true, nullsFirst: false }).limit(60),
    supabase.from("opportunities").select("id, title, starts_on, location").eq("published", true).eq("kind", "event").gte("starts_on", today).order("starts_on").limit(3),
    supabase.from("applications").select("id, status, opportunities(title)").eq("org_id", org.id).order("created_at", { ascending: false }).limit(4),
    createAdminClient().from("dhow_profile").select("booking_link, whatsapp, phone").limit(1).maybeSingle(),
  ]);

  const picked = rankForCompany((opps ?? []) as (CardOpp & { sectors: string[] })[], org).slice(0, 3);
  const verified = org.verification_status === "verified";
  const pending = org.verification_status === "pending";
  const first = profile?.full_name?.split(" ")[0];
  const steps = [
    { done: true, title: "Create your workspace", why: "Done. Welcome aboard.", href: "/app/settings", icon: Building2 },
    { done: Boolean(org.sector) && ((org.interest_kinds?.length ?? 0) + (org.interest_sectors?.length ?? 0) > 0), title: "Tell us what you're looking for", why: "Your sector and interests decide which opportunities show first.", href: "/app/settings#interests", icon: Building2 },
    { done: (docCount ?? 0) > 0, title: "Upload your company documents", why: "Your CR12 or incorporation certificate, and KRA PIN.", href: "/app/documents", icon: FileText },
    { done: verified || pending, title: "Get Dhow Verified", why: "A badge that shows partners and buyers your records check out.", href: "/app/verification", icon: BadgeCheck },
    { done: (apps?.length ?? 0) > 0, title: "Apply for your first opportunity", why: "Grants, programmes and tenders open to companies in Kenya.", href: "/app/opportunities", icon: Send },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const wa = dhow?.whatsapp ? `https://wa.me/${dhow.whatsapp.replace(/\D/g, "").replace(/^0/, "254")}` : null;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-[2rem] bg-navy-900 px-6 py-7 text-white sm:px-9 sm:py-9">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-mint/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-green/25 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-white/70">{greeting()}{first ? `, ${first}` : ""}</p>
            <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight sm:text-[2rem]">
              {org.name}
              {verified ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-navy-900"><VerifiedTick label={false} size={16} />Dhow Verified</span>
              ) : pending ? (
                <Link href="/app/verification" className="inline-flex items-center gap-1.5 rounded-full bg-amber px-2.5 py-1 text-xs font-semibold text-navy-950"><span className="size-1.5 animate-pulse rounded-full bg-navy-950" />Verification in progress</Link>
              ) : (
                <Link href="/app/verification" className="inline-flex items-center gap-1.5 rounded-full bg-bad px-2.5 py-1 text-xs font-semibold text-white ring-2 ring-bad/30 transition hover:bg-bad/90"><ShieldAlert className="size-3.5" />Not verified · Get verified</Link>
              )}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/75">
              {allDone ? "You're all set. New opportunities are added every week, checked by our team." : "A few quick steps and you'll get the most out of Dhow."}
            </p>
          </div>
          {!allDone ? (
            <div className="flex items-center gap-4">
              <div className="relative size-20 shrink-0" role="img" aria-label={`${doneCount} of ${steps.length} steps done`}>
                <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-mint)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 97.4} 97.4`} />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-sm font-semibold">{doneCount}/{steps.length}</span>
              </div>
              <Link href={steps.find((s) => !s.done)!.href} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-navy-900 shadow-sm transition hover:bg-mint-100">
                Next step <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <Link href="/app/opportunities" className="inline-flex items-center gap-2 self-start rounded-full bg-white px-5 py-3 text-sm font-semibold text-navy-900 shadow-sm transition hover:bg-mint-100 sm:self-auto">
              See open opportunities <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </section>

      <div className={cn("grid grid-cols-1 gap-6", !allDone && "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]")}>
        {!allDone ? <div className="min-w-0 space-y-6">
          {/* Getting started */}
          {!allDone ? (
            <Card className="p-0">
              <div className="flex items-center justify-between px-6 pt-6 pb-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Get started</h2>
                  <p className="text-sm text-muted">{steps.length - doneCount} step{steps.length - doneCount === 1 ? "" : "s"} left · about 10 minutes</p>
                </div>
              </div>
              <ol className="divide-y divide-line">
                {steps.map((s) => (
                  <li key={s.title}>
                    <Link href={s.href} className={cn("group flex items-center gap-4 px-6 py-4 transition hover:bg-sunken/60", s.done && "pointer-events-none")}>
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", s.done ? "bg-green text-white" : "bg-navy-50 text-navy-700")}>
                        {s.done ? <Check className="size-5" /> : <s.icon className="size-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block font-medium", s.done && "text-muted line-through decoration-line")}>{s.title}</span>
                        <span className="block text-sm text-muted">{s.why}</span>
                      </span>
                      {!s.done ? <ArrowRight className="size-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" /> : null}
                    </Link>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}
        </div> : null}

        <aside className={cn("min-w-0 space-y-6", allDone && "lg:grid lg:grid-cols-3 lg:items-start lg:gap-6 lg:space-y-0")}>
          {/* Verification */}
          <Card className={verified ? "bg-mint-100/70" : pending ? "" : "border border-bad/25 bg-bad/5"}>
            <div className="flex items-start gap-3">
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", verified ? "bg-green text-white" : pending ? "bg-amber-100 text-amber-700" : "bg-bad text-white")}>
                {verified ? <BadgeCheck className="size-5" /> : <ShieldAlert className="size-5" />}
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{verified ? "You're Dhow Verified" : pending ? "Verification in progress" : "Get Dhow Verified"}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {verified && org.verified_until ? `Valid until ${day(org.verified_until)}.` : pending ? "We're checking your records with the business registry." : "Show partners and buyers that your company's records check out."}
                </p>
              </div>
            </div>
            {!verified && !pending ? <Link href="/app/verification" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:text-navy-900">Start verification <ArrowRight className="size-4" /></Link> : null}
          </Card>

          {/* Events */}
          <Card>
            <CardHeader title="Upcoming events" href="/app/events" />
            {events?.length ? (
              <ul className="space-y-3">
                {events.map((e) => {
                  const d = new Date(`${e.starts_on}T12:00:00+03:00`);
                  return (
                    <li key={e.id}>
                      <Link href={`/app/opportunities/${e.id}`} className="flex items-center gap-3 transition hover:opacity-80">
                        <span className="grid w-12 shrink-0 rounded-2xl bg-sunken py-1.5 text-center leading-tight">
                          <span className="text-[10px] font-semibold tracking-wide text-muted uppercase">{d.toLocaleString("en-KE", { month: "short", timeZone: "Africa/Nairobi" })}</span>
                          <span className="text-lg font-semibold text-navy-900">{d.toLocaleString("en-KE", { day: "numeric", timeZone: "Africa/Nairobi" })}</span>
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 text-sm font-medium">{e.title}</span>
                          {e.location ? <span className="block truncate text-xs text-muted">{e.location}</span> : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="flex items-center gap-2 text-sm text-muted"><CalendarDays className="size-4" />No events coming up yet.</p>}
          </Card>

          {/* Applications */}
          {apps?.length ? (
            <Card>
              <CardHeader title="Your applications" href="/app/applications" />
              <ul className="space-y-3">
                {(apps as unknown as { id: string; status: string; opportunities: { title: string } | null }[]).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{a.opportunities?.title}</span>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </aside>
      </div>

      {/* Opportunities */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Picked for you</h2>
            <p className="text-sm text-muted">Open to companies in Kenya, checked by the Dhow team.</p>
          </div>
          <Link href="/app/opportunities" className="shrink-0 text-sm font-medium text-navy-600 hover:text-navy-900">See all</Link>
        </div>
        {picked.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {picked.map((o) => <OpportunityCard key={o.id} o={o} href={`/app/opportunities/${o.id}`} reason={o.match.score >= 4 ? o.match.reasons[0] : null} locked={o.requires_verified && !verified} planLocked={!atLeast(org, AUDIENCE[o.audience ?? "all"]?.need ?? "free")} />)}
          </div>
        ) : (
          <Card className="text-center">
            <Briefcase className="mx-auto size-6 text-faint" />
            <p className="mt-2 font-medium">New opportunities are on the way</p>
            <p className="text-sm text-muted">We check new grants, programmes and tenders every day.</p>
          </Card>
        )}
      </section>

      {/* Talk to Dhow */}
      <HelpForm
          side="member"
          name={profile?.full_name}
          email={user.email}
          phone={profile?.phone}
          links={[...(dhow?.booking_link ? [{ label: "Book a call", href: dhow.booking_link }] : []), ...(wa ? [{ label: "WhatsApp", href: wa }] : [])]}
        />

    </div>
  );
}
