import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { HelpArticleView } from "@/components/help";
import { staffArticles } from "@/content/help";

export const metadata: Metadata = { title: "Staff guide" };

export default async function StaffHelpArticle({ params }: { params: Promise<{ slug: string }> }) {
  await requireStaff();
  const a = staffArticles.find((x) => x.slug === (await params).slug);
  if (!a) notFound();
  return <HelpArticleView article={a} articles={staffArticles} base="/admin/help" />;
}
