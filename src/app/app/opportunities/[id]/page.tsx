import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { Badge, ButtonLink, Card, StatusBadge } from "@/components/ui";
import { day, daysUntil, label } from "@/lib/format";
import { ApplyForm } from "./apply";

export default async function Opportunity({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, supabase } = await requireMember();
  const { data: o } = await supabase.from("opportunities").select("*").eq("id", id).eq("published", true).maybeSingle();
  if (!o) notFound();
  const { data: app } = await supabase.from("applications").select("status, submitted_at").eq("org_id", org.id).eq("opportunity_id", id).maybeSingle();
  const closed = o.deadline && daysUntil(o.deadline) < 0;
  const blocked = o.requires_verified && org.verification_status !== "verified";

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/app/opportunities" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> All opportunities</Link>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-8">
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">{o.kind === "rfp" ? "RFP" : label(o.kind)}</Badge>
            {o.requires_verified ? <Badge tone="lime">Dhow Verified only</Badge> : null}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{o.title}</h1>
          <p className="mt-3 text-muted">{o.summary}</p>
          {o.body ? <div className="mt-6 border-t border-line pt-6"><Markdown source={o.body} /></div> : null}
          {o.url ? <a href={o.url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-forest-600">Official page <ExternalLink className="size-4" /></a> : null}
        </Card>
        <div className="space-y-4">
          <Card>
            <dl className="space-y-4 text-sm">
              <div><dt className="label">Source</dt><dd className="mt-1">{o.source ?? "Dhow Partners"}</dd></div>
              {o.location ? <div><dt className="label">Location</dt><dd className="mt-1">{o.location}</dd></div> : null}
              {o.deadline ? <div><dt className="label">Closes</dt><dd className="mt-1">{day(o.deadline)} {closed ? "(closed)" : `· ${daysUntil(o.deadline)} days left`}</dd></div> : null}
            </dl>
          </Card>
          <Card>
            {app ? (
              <div className="space-y-2">
                <p className="font-semibold">Your application</p>
                <StatusBadge status={app.status} />
                <p className="text-sm text-muted">Sent {day(app.submitted_at)}</p>
              </div>
            ) : closed ? (
              <p className="text-sm text-muted">Applications have closed.</p>
            ) : blocked ? (
              <div className="space-y-3">
                <p className="text-sm">This opportunity is open to Dhow Verified companies.</p>
                <ButtonLink href="/app/verification" variant="accent" className="w-full">Get verified</ButtonLink>
              </div>
            ) : <ApplyForm opportunityId={o.id} />}
          </Card>
        </div>
      </div>
    </div>
  );
}
