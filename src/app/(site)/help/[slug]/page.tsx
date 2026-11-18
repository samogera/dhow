import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HelpArticleView } from "@/components/help";
import { memberArticles } from "@/content/help";

export function generateStaticParams() {
  return memberArticles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = memberArticles.find((x) => x.slug === slug);
  return a ? { title: `${a.title} · Help`, description: a.summary } : {};
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = memberArticles.find((x) => x.slug === slug);
  if (!a) notFound();
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <HelpArticleView article={a} articles={memberArticles} base="/help" />
    </div>
  );
}
