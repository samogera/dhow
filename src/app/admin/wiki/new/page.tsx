import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { WikiEditor } from "../editor";

export const metadata: Metadata = { title: "New wiki page" };

export default async function NewWikiPage() {
  const s = await requireStaff();
  const { data } = await s.supabase.from("wiki_pages").select("section");
  const sections = [...new Set((data ?? []).map((d) => d.section))];
  return (
    <>
      <Link href="/admin/wiki" className="text-sm text-muted hover:text-ink">← Wiki</Link>
      <h1 className="mb-6 mt-2 text-3xl font-semibold tracking-tight">New page</h1>
      <WikiEditor sections={sections} />
    </>
  );
}
