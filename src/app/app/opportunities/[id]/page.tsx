import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, CalendarDays, Check, ExternalLink, Gift, MapPin, Users } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Poster } from "@/components/poster";
import { requireMember } from "@/lib/auth";
import { ButtonLink, Card, StatusBadge } from "@/components/ui";
import { day, daysUntil, label } from "@/lib/format";
import { ApplyForm } from "./apply";

export const metadata: Metadata = { title: "Opportunity" };

export default async function Opportunity({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { org, supabase } = await requireMember();
  const { data: o } = await supabase.from("opportunities").select("*").eq("id", id).eq("published", true).maybeSingle();
  if (!o) notFound();
  const { data: app } = await supabase.from("applications").select("status, submitted_at").eq("org_id", org.id).eq("opportunity_id", id).maybeSingle();
  const left = o.deadline ? daysUntil(o.deadline) : null;
  const closed = left !== null && left < 0;
  const blocked = o.requires_verified && org.verification_status !== "verified";
  const external = Boolean(o.url && o.imported_at);
  const eligibility = (o.eligibility ?? []) as string[];
  const benefits = (o.benefits ?? []) as string[];
  const sectors = (o.sectors ?? []) as string[];

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/app/opportunities" className="mb-5 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> All opportunities</Link>

      <div className="overflow-hidden rounded-[2rem] border border-line bg-white">
        <Poster src={o.image_url} kind={o.kind} className="aspect-[21/9] max-h-80 w-full" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-navy-50 px-2.5 py-1 font-semibold text-navy-900">{o.kind === "rfp" ? "RFP" : label(o.kind)}</span>
            {sectors.map((s) => <span key={s} className="rounded-full bg-sunken px-2.5 py-1 text-ink/70">{s}</span>)}
            {o.requires_verified ? <span className="flex items-center gap-1 rounded-full bg-mint-100 px-2.5 py-1 font-medium text-green"><BadgeCheck className="size-3.5" />Dhow Verified only</span> : null}
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">{o.title}</h1>
          {o.summary ? <p className="mt-3 max-w-3xl text-muted">{o.summary}</p> : null}
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/80">
            <span className="flex items-center gap-2"><CalendarDays className="size-4 text-muted" />{o.deadline ? `Closes ${day(o.deadline)}${closed ? " (closed)" : left !== null ? ` · ${left} days left` : ""}` : "Rolling deadline"}</span>
            {o.location ? <span className="flex items-center gap-2"><MapPin className="size-4 text-muted" />{o.location}</span> : null}
            <span className="flex items-center gap-2 text-muted">Source: <span className="font-medium text-ink">{o.source ?? "Dhow Partners"}</span></span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          {eligibility.length ? (
            <Card>
              <h2 className="flex items-center gap-2 font-semibold"><Users className="size-4 text-navy-500" />Who can apply</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {eligibility.map((e) => <li key={e} className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-green" />{e}</li>)}
              </ul>
            </Card>
          ) : null}
          {benefits.length ? (
            <Card className="bg-amber-100/60">
              <h2 className="flex items-center gap-2 font-semibold"><Gift className="size-4 text-amber-700" />What you get</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {benefits.map((b) => <li key={b} className="flex gap-3"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber" />{b}</li>)}
              </ul>
            </Card>
          ) : null}
          {o.body ? <Card><Markdown source={o.body} /></Card> : null}
          {!eligibility.length && !benefits.length && !o.body && external ? (
            <Card><p className="text-sm text-muted">Full details, eligibility and how to apply are on the organiser&apos;s page.</p></Card>
          ) : null}
          {external ? <p className="px-1 text-xs text-faint">Summary prepared by Dhow Partners from {o.source}. Always check the official page before applying.</p> : null}
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {external && !closed ? (
            <Card>
              <p className="font-semibold">Apply</p>
              <p className="mt-1 text-sm text-muted">Applications go through {o.source}.</p>
              <a href={o.url} target="_blank" rel="noopener noreferrer" className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-navy-900 px-5 py-3 text-sm font-medium text-white hover:bg-navy-700">
                Apply on {o.source} <ExternalLink className="size-4" />
              </a>
            </Card>
          ) : null}
          <Card>
            {app ? (
              <div className="space-y-2">
                <p className="font-semibold">Tracked in your applications</p>
                <StatusBadge status={app.status} />
                <p className="text-sm text-muted">Added {day(app.submitted_at)}</p>
              </div>
            ) : closed ? (
              <p className="text-sm text-muted">Applications have closed.</p>
            ) : blocked ? (
              <div className="space-y-3">
                <p className="text-sm">This opportunity is open to Dhow Verified companies.</p>
                <ButtonLink href="/app/verification" variant="accent" className="w-full">Get verified</ButtonLink>
              </div>
            ) : <ApplyForm opportunityId={o.id} external={external} />}
          </Card>
          {!external && o.url ? (
            <a href={o.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-sm font-medium text-navy-600">Official page <ExternalLink className="size-4" /></a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
