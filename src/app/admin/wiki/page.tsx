import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { ButtonLink, Empty, PageHeader } from "@/components/ui";
import { day } from "@/lib/format";

export const metadata: Metadata = { title: "Wiki" };

export default async function Wiki({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await requireStaff();
  const { q } = await searchParams;
  let query = s.supabase.from("wiki_pages").select("slug, title, section, updated_at").order("section").order("title");
  if (q) {
    const term = q.replace(/[%_,()]/g, "");
    query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
  }
  const { data: pages } = await query;
  const sections = [...new Set((pages ?? []).map((p) => p.section))];

  return (
    <>
      <PageHeader title="Wiki" sub="How we work: SOPs, playbooks and company knowledge.">
        <form><input name="q" defaultValue={q} placeholder="Search the wiki" className="field w-56 rounded-full py-2" /></form>
        <ButtonLink href="/admin/wiki/new">New page</ButtonLink>
      </PageHeader>
      {sections.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((sec) => (
            <section key={sec} className="card">
              <p className="label mb-3">{sec}</p>
              <ul className="space-y-1">
                {pages!.filter((p) => p.section === sec).map((p) => (
                  <li key={p.slug}>
                    <Link href={`/admin/wiki/${p.slug}`} className="-mx-3 flex items-center justify-between rounded-2xl px-3 py-2 hover:bg-sunken">
                      <span className="font-medium">{p.title}</span><span className="text-xs text-muted">{day(p.updated_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : <Empty title={q ? "Nothing matches that search" : "No pages yet"}><ButtonLink href="/admin/wiki/new">Write the first page</ButtonLink></Empty>}
    </>
  );
}
