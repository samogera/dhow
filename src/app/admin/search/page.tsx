import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Handshake, Megaphone, Target, UserRound, Users } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { Empty, PageHeader } from "@/components/ui";
import { Avatar } from "@/components/profile-bits";
import { label } from "@/lib/format";
import { kindLabel } from "@/lib/opportunity-display";

export const metadata: Metadata = { title: "Search" };

type Hit = { id: string; title: string; sub: string; href: string; img?: string | null };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await requireStaff();
  const raw = ((await searchParams).q ?? "").trim().slice(0, 80);
  const q = raw.replace(/[%_,()*]/g, " ").trim();
  const like = `%${q}%`;
  const groups: { key: string; title: string; icon: typeof Building2; hits: Hit[] }[] = [];

  if (q.length >= 2) {
    const db = s.supabase;
    const [orgs, leads, clients, partners, opps, people] = await Promise.all([
      db.from("organizations").select("id, name, sector, verification_status, logo_url").ilike("name", like).limit(8),
      db.from("leads").select("id, name, company, status").or(`name.ilike.${like},company.ilike.${like},email.ilike.${like}`).limit(8),
      db.from("clients").select("id, name, sector, stage").ilike("name", like).limit(8),
      db.from("partners").select("id, name, industry, status, logo_url").or(`name.ilike.${like},industry.ilike.${like}`).limit(8),
      db.from("opportunities").select("id, title, kind, source, published").is("dismissed_at", null).ilike("title", like).limit(8),
      db.from("team_people").select("id, full_name, title, photo_url").ilike("full_name", like).limit(8),
    ]);
    groups.push(
      { key: "orgs", title: "Member companies", icon: Building2, hits: (orgs.data ?? []).map((o) => ({ id: o.id, title: o.name, sub: [o.sector, label(o.verification_status)].filter(Boolean).join(" · "), href: `/admin/members/${o.id}`, img: o.logo_url })) },
      { key: "leads", title: "Leads", icon: Target, hits: (leads.data ?? []).map((l) => ({ id: l.id, title: l.name, sub: [l.company, label(l.status)].filter(Boolean).join(" · "), href: "/admin/leads" })) },
      { key: "clients", title: "Clients", icon: Users, hits: (clients.data ?? []).map((c) => ({ id: c.id, title: c.name, sub: [c.sector, label(c.stage)].filter(Boolean).join(" · "), href: `/admin/clients?q=${encodeURIComponent(c.name)}` })) },
      { key: "partners", title: "Partners", icon: Handshake, hits: (partners.data ?? []).map((p) => ({ id: p.id, title: p.name, sub: [p.industry, label(p.status)].filter(Boolean).join(" · "), href: `/admin/partners/${p.id}`, img: p.logo_url })) },
      { key: "opps", title: "Opportunities", icon: Megaphone, hits: (opps.data ?? []).map((o) => ({ id: o.id, title: o.title, sub: [kindLabel(o.kind), o.source, o.published ? "Live" : "Draft"].filter(Boolean).join(" · "), href: `/admin/opportunities/${o.id}` })) },
      { key: "people", title: "Team", icon: UserRound, hits: (people.data ?? []).map((p) => ({ id: p.id, title: p.full_name, sub: p.title ?? "", href: "/admin/team", img: p.photo_url })) },
    );
  }
  const found = groups.filter((g) => g.hits.length);
  const total = found.reduce((n, g) => n + g.hits.length, 0);

  return (
    <>
      <PageHeader title="Search" sub={q.length >= 2 ? `${total} result${total === 1 ? "" : "s"} for “${raw}”` : "Type at least two letters in the search box."} />
      {q.length >= 2 && !found.length ? <Empty title="Nothing found" sub="Try a shorter word, or the company's name." /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {found.map(({ key, title, icon: Icon, hits }) => (
          <section key={key} className="card">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-navy-500" />{title}<span className="text-faint">{hits.length}</span></h2>
            <ul className="space-y-1">
              {hits.map((h) => (
                <li key={h.id}>
                  <Link href={h.href} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white">
                    {h.img !== undefined ? <Avatar src={h.img} name={h.title} size="sm" /> : null}
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{h.title}</p>{h.sub ? <p className="truncate text-xs text-muted">{h.sub}</p> : null}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
