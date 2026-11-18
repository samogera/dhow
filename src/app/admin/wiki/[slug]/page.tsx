import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { Markdown } from "@/components/markdown";
import { ButtonLink } from "@/components/ui";
import { day } from "@/lib/format";
import { WikiEditor } from "../editor";

export const metadata: Metadata = { title: "Wiki" };

export default async function WikiPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { slug } = await params;
  const { edit } = await searchParams;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const s = await requireStaff();
  const { data: page } = await s.supabase.from("wiki_pages").select("id, slug, title, section, body, updated_at, profiles(full_name)").eq("slug", slug).maybeSingle();
  if (!page) notFound();
  const author = (page.profiles as unknown as { full_name: string | null } | null)?.full_name;

  if (edit) {
    const { data } = await s.supabase.from("wiki_pages").select("section");
    return (
      <>
        <Link href={`/admin/wiki/${slug}`} className="text-sm text-muted hover:text-ink">← Back to page</Link>
        <h1 className="mb-6 mt-2 text-3xl font-semibold tracking-tight">Edit page</h1>
        <WikiEditor page={page} sections={[...new Set((data ?? []).map((d) => d.section))]} />
      </>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/wiki" className="text-sm text-muted hover:text-ink">← Wiki / {page.section}</Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{page.title}</h1>
          <p className="mt-1 text-sm text-muted">Updated {day(page.updated_at)}{author ? ` by ${author}` : ""}</p>
        </div>
        <ButtonLink variant="outline" href={`/admin/wiki/${slug}?edit=1`}>Edit</ButtonLink>
      </div>
      <article className="card max-w-3xl p-8 sm:p-10">
        {page.body.trim() ? <Markdown source={page.body} /> : <p className="text-muted">This page is empty.</p>}
      </article>
    </>
  );
}
