import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { Card, CardHeader, Stat, StatusBadge } from "@/components/ui";
import { Avatar, SocialLinks } from "@/components/profile-bits";
import { day, label } from "@/lib/format";
import { DOC_KINDS, PLAN_LABEL, type PlanTier } from "@/lib/types";

export const metadata: Metadata = { title: "Member company" };

export default async function Member({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await requireStaff();
  const { data: o } = await s.supabase.from("organizations")
    .select("id, name, sector, country, website, plan, verification_status, verified_until, created_at, logo_url, tagline, about, phone, email, address, founded_year, team_size, socials, brs_number")
    .eq("id", id).maybeSingle();
  if (!o) notFound();
  const [{ data: apps }, { data: docs }, { data: checks }, { count: people }] = await Promise.all([
    s.supabase.from("applications").select("id, status, submitted_at, opportunities(id, title, kind)").eq("org_id", id).neq("status", "draft").order("submitted_at", { ascending: false }),
    s.supabase.from("documents").select("id, kind, file_name, status, created_at").eq("org_id", id).neq("status", "pending_upload").order("created_at", { ascending: false }),
    s.supabase.from("verifications").select("id, status, tier, provider, created_at, decided_at").eq("org_id", id).order("created_at", { ascending: false }).limit(10),
    s.supabase.from("memberships").select("user_id", { count: "exact", head: true }).eq("org_id", id),
  ]);
  const won = (apps ?? []).filter((a) => a.status === "won").length;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/members" className="mb-5 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />All companies</Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar src={o.logo_url} name={o.name} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={o.verification_status} /><span className="rounded-full bg-sunken px-2.5 py-1 text-xs font-medium">{PLAN_LABEL[o.plan as PlanTier]}</span></div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">{o.name}</h1>
            {o.tagline ? <p className="mt-1 text-muted">{o.tagline}</p> : null}
            <p className="mt-3 text-sm text-ink/70">{[o.sector, o.country, o.founded_year ? `Founded ${o.founded_year}` : null, o.team_size ? `${o.team_size} people` : null].filter(Boolean).join(" · ")}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {o.email ? <a href={`mailto:${o.email}`} className="flex items-center gap-1.5 text-navy-600"><Mail className="size-4" />{o.email}</a> : null}
              {o.phone ? <a href={`tel:${o.phone}`} className="flex items-center gap-1.5 text-navy-600"><Phone className="size-4" />{o.phone}</a> : null}
              {o.address ? <span className="flex items-center gap-1.5 text-muted"><MapPin className="size-4" />{o.address}</span> : null}
            </div>
            <div className="mt-4"><SocialLinks website={o.website} socials={o.socials as Record<string, string>} /></div>
          </div>
        </div>
        {o.about ? <p className="mt-6 max-w-3xl whitespace-pre-line border-t border-line pt-6 text-[0.95rem] leading-relaxed text-ink/85">{o.about}</p> : null}
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Applications" value={apps?.length ?? 0} />
        <Stat label="Won" value={won} />
        <Stat label="Documents" value={docs?.length ?? 0} />
        <Stat label="People with access" value={people ?? 0} note={`Joined ${day(o.created_at)}`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Applications" sub="Opportunities this company applied to or is tracking" />
          {apps?.length ? (
            <ul className="divide-y divide-line">
              {apps.map((a) => {
                const op = a.opportunities as unknown as { id: string; title: string; kind: string } | null;
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      {op ? <Link href={`/admin/opportunities/${op.id}`} className="line-clamp-1 font-medium hover:text-navy-700">{op.title}</Link> : <p className="font-medium">Removed opportunity</p>}
                      <p className="text-xs text-muted">{a.submitted_at ? day(a.submitted_at) : ""}{op ? ` · ${label(op.kind)}` : ""}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-muted">Hasn&apos;t applied to anything yet.</p>}
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Verification" sub={o.brs_number ? `BRS ${o.brs_number}` : "No registration number yet"} />
            {checks?.length ? (
              <ul className="space-y-2 text-sm">
                {checks.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/reviews/${c.id}`} className="hover:text-navy-700">{day(c.created_at)} · {label(c.tier)}{c.provider ? ` · ${c.provider}` : ""}</Link>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No verification requests.</p>}
          </Card>
          <Card>
            <CardHeader title="Documents" />
            {docs?.length ? (
              <ul className="space-y-2 text-sm">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{DOC_KINDS[d.kind as keyof typeof DOC_KINDS] ?? d.kind}</span>
                    <StatusBadge status={d.status} />
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No documents uploaded.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
