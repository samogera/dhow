import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Mail, MapPin, Phone, Star } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Card, CardHeader, StatusBadge } from "@/components/ui";
import { Avatar, SocialLinks } from "@/components/profile-bits";
import { InternalFiles } from "@/components/internal-files";
import { PartnerFields, type PartnerRow } from "@/components/partner-fields";
import { makePartnerLink, savePartnerProfile } from "@/actions/profiles";
import { CopyField } from "@/components/copy-field";
import { PARTNER_DOCS } from "@/lib/partner-docs";
import { appUrl } from "@/lib/app-url";
import { cn, day } from "@/lib/format";

export const metadata: Metadata = { title: "Partner" };

export default async function Partner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await requireStaff();
  const [{ data: p }, { data: files }, { data: contacts }, { data: reviews }] = await Promise.all([
    s.supabase.from("partners").select("*").eq("id", id).maybeSingle(),
    s.supabase.from("internal_files").select("id, label, category, file_name, size_bytes, expires_on, created_at, uploaded_via").eq("owner_type", "partner").eq("owner_id", id).order("created_at", { ascending: false }),
    s.supabase.from("contacts").select("id, name, role, email, phone").eq("partner_id", id),
    s.supabase.from("partner_reviews").select("*").eq("partner_id", id).order("created_at", { ascending: false }),
  ]);
  if (!p) notFound();
  const partner = p as PartnerRow;
  const today = new Date().toISOString().slice(0, 10);
  const have = (key: string) => (files ?? []).find((f) => f.category === key && (!f.expires_on || f.expires_on >= today));
  const avg = reviews?.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : null;
  const base = appUrl();

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/partners" className="mb-5 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />All partners</Link>
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar src={partner.logo_url} name={partner.name} size="xl" />
          <div className="min-w-0 flex-1">
            <StatusBadge status={partner.status} />
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">{partner.name}</h1>
            <p className="mt-1 text-muted">{[partner.industry, partner.discipline, `${partner.relationship} partner`].filter(Boolean).join(" · ")}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {partner.email ? <a href={`mailto:${partner.email}`} className="flex items-center gap-1.5 text-navy-600"><Mail className="size-4" />{partner.email}</a> : null}
              {partner.phone ? <a href={`tel:${partner.phone}`} className="flex items-center gap-1.5 text-navy-600"><Phone className="size-4" />{partner.phone}</a> : null}
              {partner.address ? <span className="flex items-center gap-1.5 text-muted"><MapPin className="size-4" />{partner.address}</span> : null}
            </div>
            <div className="mt-3"><SocialLinks website={partner.website} socials={partner.socials} /></div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-1 sm:text-right">
            <div><p className="label">Agreed</p><p className="num text-2xl font-semibold text-navy-900">{partner.agreed_pct != null ? `${Number(partner.agreed_pct)}%` : "—"}</p></div>
            <div><p className="label">Client rating</p><p className="flex items-center gap-1 text-2xl font-semibold sm:justify-end">{avg ? <><Star className="size-5 fill-amber text-amber" />{avg.toFixed(1)}</> : "—"}</p></div>
          </div>
        </div>
        {partner.services?.length ? <div className="mt-5 flex flex-wrap gap-1.5">{partner.services.map((sv) => <span key={sv} className="rounded-full bg-sunken px-3 py-1 text-sm">{sv}</span>)}</div> : null}
        {partner.about ? <p className="mt-5 max-w-3xl whitespace-pre-line border-t border-line pt-5 text-[0.95rem] leading-relaxed text-ink/85">{partner.about}</p> : null}
        {partner.commission_terms ? <p className="mt-3 text-sm text-muted">Terms: {partner.commission_terms}</p> : null}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <CardHeader title="Details" />
          <ActionForm action={savePartnerProfile} submit="Save partner" className="grid gap-4 sm:grid-cols-2"><PartnerFields p={partner} full /></ActionForm>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Required documents" sub="Ticked when a current copy is on file" />
            <ul className="space-y-2.5 text-sm">
              {PARTNER_DOCS.map((d) => {
                const f = have(d.key);
                return (
                  <li key={d.key} className="flex items-start gap-2.5">
                    {f ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green" /> : <Circle className={cn("mt-0.5 size-4 shrink-0", d.required ? "text-amber" : "text-faint")} />}
                    <span className={cn("flex-1", !f && "text-ink/70")}>{d.label}{!d.required ? <span className="text-faint"> · optional</span> : null}</span>
                    {f?.expires_on ? <span className="text-xs text-muted">to {day(f.expires_on)}</span> : null}
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 rounded-2xl bg-mint-100/60 p-4">
              <p className="text-sm font-semibold">Ask the partner to upload them</p>
              <p className="mb-3 text-xs text-muted">Send this private link. They upload without an account, and the files appear here.</p>
              {partner.upload_token ? (
                <>
                  <CopyField value={`${base}/partner/${partner.upload_token}`} share={`Hello from Dhow Partners. Please upload your company documents here:`} />
                  <form action={makePartnerLink} className="mt-2"><input type="hidden" name="id" value={partner.id} /><input type="hidden" name="kind" value="upload" /><input type="hidden" name="reset" value="1" /><button className="text-xs text-muted underline">Make a new link (the old one stops working)</button></form>
                </>
              ) : (
                <form action={makePartnerLink}><input type="hidden" name="id" value={partner.id} /><input type="hidden" name="kind" value="upload" /><button className="rounded-full bg-navy-900 px-4 py-2 text-xs font-medium text-white">Create upload link</button></form>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Files" sub="Staff only" />
            <InternalFiles files={files ?? []} ownerType="partner" ownerId={partner.id} />
          </Card>
          <Card>
            <CardHeader title="Client reviews" sub={reviews?.length ? `${reviews.length} review${reviews.length === 1 ? "" : "s"} · average ${avg?.toFixed(1)} of 5` : "Ask clients how this partner did"} />
            {reviews?.length ? (
              <ul className="mb-5 space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-2xl bg-sunken/70 p-3.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{r.reviewer_name}{r.reviewer_company ? <span className="font-normal text-muted"> · {r.reviewer_company}</span> : null}</p>
                      <span className="flex shrink-0">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn("size-3.5", n <= r.rating ? "fill-amber text-amber" : "text-line")} />)}</span>
                    </div>
                    {r.comment ? <p className="mt-1.5 text-ink/80">{r.comment}</p> : null}
                    <p className="mt-1 text-xs text-faint">{day(r.created_at)}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            {partner.review_token ? (
              <CopyField value={`${base}/review/${partner.review_token}`} share={`How did ${partner.name} do for you? Please leave a short review for Dhow Partners:`} />
            ) : (
              <form action={makePartnerLink}><input type="hidden" name="id" value={partner.id} /><input type="hidden" name="kind" value="review" /><button className="rounded-full bg-navy-900 px-4 py-2 text-xs font-medium text-white">Create review link for clients</button></form>
            )}
          </Card>
          {contacts?.length ? (
            <Card>
              <CardHeader title="People" />
              <ul className="space-y-2 text-sm">{contacts.map((c) => <li key={c.id}><span className="font-medium">{c.name}</span>{c.role ? <span className="text-muted"> · {c.role}</span> : null}{c.email ? <span className="text-muted"> · {c.email}</span> : null}</li>)}</ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
