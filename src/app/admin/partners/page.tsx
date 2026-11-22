import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2, Search, Star } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Drawer } from "@/components/drawer";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";
import { Avatar } from "@/components/profile-bits";
import { PartnerFields } from "@/components/partner-fields";
import { missingDocs, PARTNER_DOCS } from "@/lib/partner-docs";
import { cn } from "@/lib/format";
import { savePartnerProfile } from "@/actions/profiles";

export const metadata: Metadata = { title: "Partners" };

export default async function Partners({ searchParams }: { searchParams: Promise<{ q?: string; industry?: string; status?: string; type?: string; docs?: string }> }) {
  const s = await requireStaff();
  const f = await searchParams;
  const [{ data: rows }, { data: files }, { data: reviews }] = await Promise.all([
    s.supabase.from("partners").select("id, name, industry, discipline, relationship, status, logo_url, agreed_pct, services").order("name"),
    s.supabase.from("internal_files").select("owner_id, category, expires_on").eq("owner_type", "partner"),
    s.supabase.from("partner_reviews").select("partner_id, rating"),
  ]);
  const all = rows ?? [];
  const industries = [...new Set(all.map((p) => p.industry).filter(Boolean))].sort() as string[];
  const required = PARTNER_DOCS.filter((d) => d.required).length;
  const inst = (id: string) => all.find((p) => p.id === id)?.relationship === "institution";
  const info = (id: string) => {
    const fs = (files ?? []).filter((x) => x.owner_id === id);
    const rs = (reviews ?? []).filter((r) => r.partner_id === id);
    return { missing: inst(id) ? 0 : missingDocs(fs).length, rating: rs.length ? rs.reduce((n, r) => n + r.rating, 0) / rs.length : null, reviews: rs.length };
  };
  const q = (f.q ?? "").trim().toLowerCase();
  const list = all.filter((p) =>
    (!q || [p.name, p.industry, p.discipline, ...(p.services ?? [])].some((v) => v?.toLowerCase().includes(q))) &&
    (!f.industry || p.industry === f.industry) && (!f.status || p.status === f.status) && (!f.type || p.relationship === f.type) &&
    (!f.docs || (f.docs === "complete" ? info(p.id).missing === 0 : info(p.id).missing > 0)));
  const filtered = Boolean(q || f.industry || f.status || f.type || f.docs);
  const sel = "rounded-full border border-white/80 bg-white/70 px-3.5 py-2 text-sm backdrop-blur";

  return (
    <>
      <PageHeader title="Partners" sub="The firms we deliver with and who refer to us: what they do, our agreed percentage, their documents and client reviews.">
        <Drawer label="Add partner" title="Add a partner" sub="Add the basics now. Logo, documents and links go on their page.">
          <ActionForm action={savePartnerProfile} submit="Add partner" className="grid gap-3 sm:grid-cols-2"><PartnerFields /></ActionForm>
        </Drawer>
      </PageHeader>

      <form className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={f.q} placeholder="Name, industry or service" aria-label="Search partners" className={cn(sel, "w-full pl-10")} />
        </div>
        <select name="industry" defaultValue={f.industry ?? ""} aria-label="Industry" className={sel}><option value="">All industries</option>{industries.map((i) => <option key={i}>{i}</option>)}</select>
        <select name="status" defaultValue={f.status ?? ""} aria-label="Status" className={sel}><option value="">Any status</option><option value="approved">Approved</option><option value="vetting">Vetting</option><option value="paused">Paused</option><option value="rejected">Rejected</option></select>
        <select name="type" defaultValue={f.type ?? ""} aria-label="Type" className={sel}><option value="">All types</option><option value="service">Service</option><option value="referral">Referral</option><option value="institution">Chamber or government</option></select>
        <select name="docs" defaultValue={f.docs ?? ""} aria-label="Documents" className={sel}><option value="">Any documents</option><option value="complete">Documents complete</option><option value="missing">Documents missing</option></select>
        <button className="rounded-full bg-navy-900 px-4 py-2 text-sm font-medium text-white">Filter</button>
        {filtered ? <Link href="/admin/partners" className="text-sm text-muted underline">Clear</Link> : null}
        <span className="ml-auto text-sm text-muted">{list.length} of {all.length}</span>
      </form>

      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const i = info(p.id);
            return (
              <Link key={p.id} href={`/admin/partners/${p.id}`} className="card lift flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Avatar src={p.logo_url} name={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy-900">{p.name}</p>
                    <p className="truncate text-sm text-muted">{p.industry ?? "Industry not set"} · {p.relationship === "institution" ? "Chamber or government" : <span className="capitalize">{p.relationship}</span>}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                {p.services?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {p.services.slice(0, 4).map((sv: string) => <span key={sv} className="rounded-full bg-sunken px-2.5 py-1 text-xs">{sv}</span>)}
                    {p.services.length > 4 ? <span className="px-1 py-1 text-xs text-muted">+{p.services.length - 4}</span> : null}
                  </div>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs">
                  {p.relationship === "institution" ? <span className="text-muted">Chamber or government · no documents needed</span> : (
                    <>
                      <span className="font-semibold text-navy-900">{p.agreed_pct != null ? `${Number(p.agreed_pct)}% agreed` : <span className="font-normal text-muted">No % set</span>}</span>
                      <span className={cn("flex items-center gap-1", i.missing ? "text-amber-700" : "text-green")}><FileCheck2 className="size-3.5" />{i.missing ? `${i.missing} of ${required} documents missing` : "Documents complete"}</span>
                    </>
                  )}
                  {i.rating ? <span className="flex items-center gap-1 text-ink/80"><Star className="size-3.5 fill-amber text-amber" />{i.rating.toFixed(1)} ({i.reviews})</span> : null}
                </div>
              </Link>
            );
          })}
        </div>
      ) : <Empty title={filtered ? "No partners match" : "No partners yet"} sub={filtered ? "Try fewer filters." : "Add the firms you work with."} />}
    </>
  );
}
