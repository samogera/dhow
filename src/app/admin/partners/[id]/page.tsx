import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Card, CardHeader, StatusBadge } from "@/components/ui";
import { Avatar, SocialLinks } from "@/components/profile-bits";
import { InternalFiles } from "@/components/internal-files";
import { PartnerFields, type PartnerRow } from "@/components/partner-fields";
import { savePartnerProfile } from "@/actions/profiles";

export const metadata: Metadata = { title: "Partner" };

export default async function Partner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await requireStaff();
  const [{ data: p }, { data: files }, { data: contacts }] = await Promise.all([
    s.supabase.from("partners").select("*").eq("id", id).maybeSingle(),
    s.supabase.from("internal_files").select("id, label, category, file_name, size_bytes, expires_on, created_at").eq("owner_type", "partner").eq("owner_id", id).order("created_at", { ascending: false }),
    s.supabase.from("contacts").select("id, name, role, email, phone").eq("partner_id", id),
  ]);
  if (!p) notFound();
  const partner = p as PartnerRow;

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
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <CardHeader title="Details" />
          <ActionForm action={savePartnerProfile} submit="Save partner" className="grid gap-4 sm:grid-cols-2"><PartnerFields p={partner} full /></ActionForm>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Documents" sub="Certificates, company profile, registration and tax papers. Staff only." />
            <InternalFiles files={files ?? []} ownerType="partner" ownerId={partner.id} />
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
