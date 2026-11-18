import Link from "next/link";
import { BadgeCheck, CalendarClock, FileText, ShieldAlert } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { ButtonLink, Card, CardHeader, Empty, Meter, PageHeader, StatusBadge } from "@/components/ui";
import { bytes, day, daysUntil, label } from "@/lib/format";
import { PLAN_LABEL, storageCapBytes } from "@/lib/types";

export default async function Dashboard() {
  const { org, profile, supabase } = await requireMember();
  const [{ data: docs }, { data: opps }, { data: apps }] = await Promise.all([
    supabase.from("documents").select("id, file_name, kind, status, created_at").eq("org_id", org.id).neq("status", "pending_upload").order("created_at", { ascending: false }).limit(4),
    supabase.from("opportunities").select("id, title, kind, source, deadline, requires_verified").eq("published", true).or(`deadline.is.null,deadline.gte.${new Date().toISOString().slice(0, 10)}`).order("deadline", { ascending: true, nullsFirst: false }).limit(5),
    supabase.from("applications").select("id, status, opportunities(title)").eq("org_id", org.id).order("created_at", { ascending: false }).limit(4),
  ]);

  const verified = org.verification_status === "verified";
  const cap = storageCapBytes(org.plan, org.verification_status);
  const first = profile?.full_name?.split(" ")[0];

  return (
    <>
      <PageHeader title="Welcome back," accent={first || org.name} sub={`${org.name} · ${PLAN_LABEL[org.plan]} plan`}>
        <ButtonLink href="/app/documents" variant="outline"><FileText className="size-4" /> Upload documents</ButtonLink>
        {!verified ? <ButtonLink href="/app/verification" variant="accent"><BadgeCheck className="size-4" /> Get verified</ButtonLink> : null}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Verification status, the green card */}
        <div className={verified ? "card bg-navy-900 text-white" : "card"}>
          <div className="flex items-start justify-between">
            <div>
              <p className={verified ? "text-sm text-white/70" : "label"}>Verification</p>
              <p className="mt-1 text-sm">{verified ? "Your badge is live" : "Build trust with partners and buyers"}</p>
            </div>
            {verified ? <BadgeCheck className="size-6 text-mint" /> : <ShieldAlert className="size-6 text-warn" />}
          </div>
          <p className="mt-10 text-3xl font-semibold tracking-tight">{verified ? "Dhow Verified" : label(org.verification_status)}</p>
          <p className={verified ? "mt-1 text-sm text-white/70" : "mt-1 text-sm text-muted"}>
            {verified && org.verified_until ? `Valid until ${day(org.verified_until)}` : org.verification_status === "pending" ? "A reviewer is checking your records." : "Free review, or instant by M-Pesa."}
          </p>
        </div>

        <Card>
          <CardHeader title="Storage" sub="PDF, PNG and JPG documents" href="/app/documents" />
          <p className="num text-3xl font-semibold tracking-tight">{bytes(org.storage_used_bytes)}</p>
          <p className="mt-1 mb-4 text-sm text-muted">of {bytes(cap)} on your plan</p>
          <Meter value={org.storage_used_bytes} max={cap} label="Storage used" />
        </Card>

        <Card>
          <CardHeader title="Applications" sub="Where your bids stand" href="/app/applications" />
          {apps?.length ? (
            <ul className="space-y-3">
              {(apps as unknown as { id: string; status: string; opportunities: { title: string } }[]).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{a.opportunities?.title}</span>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No applications yet.</p>}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Open opportunities" sub="RFPs, grants and events picked for members" href="/app/opportunities" />
          {opps?.length ? (
            <ul className="divide-y divide-line">
              {opps.map((o) => (
                <li key={o.id}>
                  <Link href={`/app/opportunities/${o.id}`} className="flex items-center gap-4 py-3.5 transition hover:opacity-80">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-navy-50 text-navy-600"><CalendarClock className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{o.title}</span>
                      <span className="block text-xs text-muted">{label(o.kind)}{o.source ? ` · ${o.source}` : ""}{o.requires_verified ? " · Verified only" : ""}</span>
                    </span>
                    {o.deadline ? <span className="text-right text-xs text-muted"><span className="block font-medium text-ink">{day(o.deadline)}</span>{daysUntil(o.deadline)} days left</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty title="No open opportunities right now" sub="We add new ones every week." />}
        </Card>

        <Card>
          <CardHeader title="Recent documents" href="/app/documents" />
          {docs?.length ? (
            <ul className="space-y-3">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 text-sm">
                  <span className="grid size-9 place-items-center rounded-xl bg-sunken"><FileText className="size-4 text-muted" /></span>
                  <span className="min-w-0 flex-1 truncate">{d.file_name}</span>
                  <StatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          ) : <Empty title="No documents yet" sub="Upload your CR12 and KRA PIN certificate to get verified." />}
        </Card>
      </div>
    </>
  );
}
