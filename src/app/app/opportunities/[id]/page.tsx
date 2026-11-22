import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BadgeCheck, CalendarDays, Check, Clock, Gift, Globe2, Lightbulb, MapPin, Star, Users } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Poster } from "@/components/poster";
import { requireMember } from "@/lib/auth";
import { AUDIENCE, TIERS, atLeast, tierOf } from "@/lib/plans";
import { loadDiscounts } from "@/lib/discounts";
import { timer } from "@/lib/timing";
import { createAdminClient } from "@/lib/supabase/admin";
import { RequestButton } from "@/components/request-button";
import { StageSelect } from "@/app/app/applications/stage";
import { ButtonLink, Card, StatusBadge } from "@/components/ui";
import { cn, day, daysUntil } from "@/lib/format";
import { credit, defaultWhy, eventDates, hostOf, kindLabel, officialLink } from "@/lib/opportunity-display";
import { splitTitle } from "@/lib/opportunity-parse";
import { ApplyForm } from "./apply";

export const metadata: Metadata = { title: "Opportunity" };

function Fact({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-sunken/70 p-3.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-navy-500" />
      <div className="min-w-0"><p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p><p className="mt-0.5 text-sm font-medium text-ink">{children}</p></div>
    </div>
  );
}

export default async function Opportunity({ params }: { params: Promise<{ id: string }> }) {
  const tick = timer("opportunity page");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { org, supabase } = await requireMember();
  const { data: o } = await supabase.from("opportunities").select("*").eq("id", id).eq("published", true).maybeSingle();
  if (!o) notFound();
  const { data: app } = await supabase.from("applications").select("id, status, submitted_at").eq("org_id", org.id).eq("opportunity_id", id).neq("status", "withdrawn").maybeSingle();

  const t = splitTitle(o.title);
  const left = o.deadline ? daysUntil(o.deadline) : null;
  const closed = left !== null && left < 0;
  const { data: rep } = await createAdminClient().from("member_requests").select("id").eq("org_id", org.id).eq("kind", "event_representation").eq("target_id", id).in("status", ["new", "in_progress"]).maybeSingle();
  const repAsked = Boolean(rep);
  const myDiscount = o.kind === "event" ? (await loadDiscounts())[tierOf(org)].events_pct : 0;
  const aud = AUDIENCE[(o.audience as string) ?? "all"] ?? AUDIENCE.all;
  const membersOnly = !atLeast(org, aud.need);
  const blocked = o.requires_verified && org.verification_status !== "verified";
  const official = officialLink(o);
  const from = credit(o);
  const ev = eventDates(o);
  const eligibility = (o.eligibility ?? []) as string[];
  const benefits = (o.benefits ?? []) as string[];
  const sectors = (o.sectors ?? []) as string[];
  const about = String(o.about ?? "").trim() || String(o.summary ?? "");
  const why = String(o.dhow_note ?? "").trim() || defaultWhy(o.kind, benefits);
  const isEvent = o.kind === "event";
  const go = official ?? (from.href && !from.byDhow ? from.href : null);

  const applyButton = go && !closed && !membersOnly ? (
    <a href={go} target="_blank" rel="noopener noreferrer"
      className="flex w-full items-center justify-center gap-2 rounded-full bg-navy-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-navy-700">
      {official ? (isEvent ? "Register on the official site" : "Apply on the official site") : "How to apply (original post)"} <ArrowUpRight className="size-4" />
    </a>
  ) : null;

  tick("ready");
  return (
    <div className="mx-auto max-w-6xl">
      <Link href={isEvent ? "/app/events" : "/app/opportunities"} className="mb-5 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" />{isEvent ? "All events" : "All opportunities"}
      </Link>

      {/* Hero */}
      <div className="grid overflow-hidden rounded-[2rem] border border-line bg-white lg:grid-cols-[1.05fr_1fr]">
        <Poster src={o.image_url} kind={o.kind} className="aspect-[16/10] lg:aspect-auto lg:min-h-[26rem]" />
        <div className="flex flex-col p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-navy-50 px-2.5 py-1 font-semibold text-navy-900">{kindLabel(o.kind)}</span>
            {o.featured ? <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700"><Star className="size-3.5 fill-current" />Recommended by Dhow</span> : null}
            {o.requires_verified ? <span className="flex items-center gap-1 rounded-full bg-mint-100 px-2.5 py-1 font-medium text-green"><BadgeCheck className="size-3.5" />Dhow Verified only</span> : null}
          </div>
          <h1 className="mt-4 text-2xl leading-tight font-semibold tracking-tight text-navy-900 sm:text-[2rem]">{t.headline}</h1>
          {t.sub ? <p className="mt-2 text-base text-muted">{t.sub}</p> : null}
          {t.tag ? <p className="mt-4 self-start rounded-xl bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700">{t.tag}</p> : null}

          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {ev ? <Fact icon={CalendarDays} label="When">{day(ev.start)}{ev.end ? ` – ${day(ev.end)}` : ""}</Fact> : null}
            {o.venue ? <Fact icon={MapPin} label="Venue">{o.venue}</Fact> : null}
            <Fact icon={Clock} label={isEvent ? "Register by" : "Deadline"}>
              {o.deadline ? <>{day(o.deadline)} <span className={cn("font-normal", left !== null && left <= 7 && !closed ? "text-bad" : "text-muted")}>· {closed ? "closed" : left === 0 ? "today" : `${left} days left`}</span></> : "Rolling / not stated"}
            </Fact>
            {o.location && !o.venue ? <Fact icon={MapPin} label="Where">{o.location}</Fact> : null}
            {official ? <Fact icon={Globe2} label="Organiser's site">{hostOf(official)}</Fact> : null}
          </div>

          {sectors.length ? <div className="mt-4 flex flex-wrap gap-1.5">{sectors.map((s) => <span key={s} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink/70">{s}</span>)}</div> : null}
          <div className="mt-auto pt-6 lg:hidden">{applyButton}</div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {about ? (
            <Card className="p-6 sm:p-7">
              <h2 className="text-lg font-semibold text-navy-900">About</h2>
              <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-ink/85">{about.split(/\n{2,}/).map((p) => <p key={p}>{p}</p>)}</div>
            </Card>
          ) : null}

          <Card className="border-mint/40 bg-mint-100/50 p-6 sm:p-7">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-navy-900"><Lightbulb className="size-5 text-green" />Why it matters</h2>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-ink/85">{why}</p>
          </Card>

          {eligibility.length || benefits.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {eligibility.length ? (
                <Card className="p-6">
                  <h2 className="flex items-center gap-2 font-semibold text-navy-900"><Users className="size-4 text-navy-500" />Who can apply</h2>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed">{eligibility.map((e) => <li key={e} className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-green" />{e}</li>)}</ul>
                </Card>
              ) : null}
              {benefits.length ? (
                <Card className="bg-amber-100/50 p-6">
                  <h2 className="flex items-center gap-2 font-semibold text-navy-900"><Gift className="size-4 text-amber-700" />What you get</h2>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed">{benefits.map((b) => <li key={b} className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber" />{b}</li>)}</ul>
                </Card>
              ) : null}
            </div>
          ) : null}

          {o.body ? <Card className="p-6 sm:p-7"><Markdown source={o.body} /></Card> : null}
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="hidden space-y-3 lg:block">
            <p className="font-semibold">{closed ? "Applications have closed" : isEvent ? "Attend" : "Apply"}</p>
            {!closed ? <p className="text-sm text-muted">{official ? `You apply directly with the organiser at ${hostOf(official)}.` : go ? "The original post explains how to apply." : "Tell us you're interested and we'll follow up."}</p> : null}
            {applyButton}
          </Card>
          <Card>
            {app ? (
              <div className="space-y-2">
                <p className="font-semibold">In My applications</p>
                {["interested", "draft", "started", "submitted"].includes(app.status)
                  ? <div className="flex items-center gap-2 text-sm text-muted">Stage <StageSelect id={app.id} status={app.status === "draft" ? "interested" : app.status} /></div>
                  : <StatusBadge status={app.status} />}
                <p className="text-sm text-muted">Added {day(app.submitted_at)}</p>
              </div>
            ) : closed ? (
              <p className="text-sm text-muted">This one has closed. New opportunities are added every day.</p>
            ) : membersOnly ? (
              <div className="space-y-3">
                <p className="text-sm">{aud.need === "premium" ? "This one is for Growth and Enterprise members." : "This one is for members, from the Startup plan."}</p>
                <ButtonLink href="/app/plans" variant="accent" className="w-full">See plans</ButtonLink>
              </div>
            ) : blocked ? (
              <div className="space-y-3">
                <p className="text-sm">This opportunity is open to Dhow Verified companies.</p>
                <ButtonLink href="/app/verification" variant="accent" className="w-full">Get verified</ButtonLink>
              </div>
            ) : <ApplyForm opportunityId={o.id} external={Boolean(go)} />}
          </Card>
          {isEvent && !closed ? (
            <Card className="space-y-3">
              <p className="font-semibold">Can&apos;t make it, or want a stand?</p>
              <p className="text-sm text-muted">Dhow can represent your company here: share your materials, meet people for you and report back. There&apos;s a fee, discounted for members.</p>
              {myDiscount ? <p className="rounded-xl bg-mint-100/70 px-3 py-2 text-xs font-medium text-green">Your {TIERS[tierOf(org)].name} discount: {myDiscount}% off</p> : null}
              {atLeast(org, "basic")
                ? <RequestButton kind="event_representation" targetId={o.id} label="Ask Dhow to represent us" placeholder="What should we bring, and who should we meet? (optional)" done={repAsked} />
                : <ButtonLink href="/app/plans" variant="outline" className="w-full">Available from Startup</ButtonLink>}
            </Card>
          ) : null}
        </div>
      </div>

      {/* Credit */}
      <div className="mt-8 flex flex-col gap-2 border-t border-line pt-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        {from.byDhow ? (
          <p>Added by the Dhow team.</p>
        ) : (
          <p>
            Sourced from <span className="font-medium text-ink">{from.label}</span>
            {from.href ? <> · <a href={from.href} target="_blank" rel="noopener noreferrer" className="font-medium text-navy-600 hover:underline">read the original post</a></> : null}
            . Summary by Dhow Partners.
          </p>
        )}
        <p className="text-xs text-faint">Always confirm the details on the organiser&apos;s page before applying.</p>
      </div>
    </div>
  );
}
