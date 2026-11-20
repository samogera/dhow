import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Drawer } from "@/components/drawer";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";
import { Avatar } from "@/components/profile-bits";
import { PartnerFields } from "@/components/partner-fields";
import { savePartnerProfile } from "@/actions/profiles";

export const metadata: Metadata = { title: "Partners" };

export default async function Partners() {
  const s = await requireStaff();
  const [{ data: partners }, { data: files }] = await Promise.all([
    s.supabase.from("partners").select("id, name, industry, discipline, relationship, status, logo_url, commission_terms").order("name"),
    s.supabase.from("internal_files").select("owner_id").eq("owner_type", "partner"),
  ]);
  const fileCount = (id: string) => (files ?? []).filter((f) => f.owner_id === id).length;

  return (
    <>
      <PageHeader title="Partners" sub="The firms we deliver with and the people who refer to us, with their documents.">
        <Drawer label="Add partner" title="Add a partner" sub="Add the basics now. Logo, documents and links go on their page.">
          <ActionForm action={savePartnerProfile} submit="Add partner" className="grid gap-3 sm:grid-cols-2"><PartnerFields /></ActionForm>
        </Drawer>
      </PageHeader>
      {partners?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {partners.map((p) => (
            <Link key={p.id} href={`/admin/partners/${p.id}`} className="card flex flex-col gap-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_rgba(13,28,41,0.22)]">
              <div className="flex items-start gap-3">
                <Avatar src={p.logo_url} name={p.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-navy-900">{p.name}</p>
                  <p className="truncate text-sm text-muted">{[p.industry, p.discipline].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                <span className="capitalize">{p.relationship} partner</span>
                <span>· {fileCount(p.id)} document{fileCount(p.id) === 1 ? "" : "s"}</span>
                {p.commission_terms ? <span>· {p.commission_terms}</span> : null}
              </div>
            </Link>
          ))}
        </div>
      ) : <Empty title="No partners yet" sub="Add the firms you work with." />}
    </>
  );
}
