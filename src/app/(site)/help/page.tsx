import type { Metadata } from "next";
import { HelpIndex } from "@/components/help";
import { memberArticles } from "@/content/help";

export const metadata: Metadata = { title: "Help Centre", description: "Step-by-step guides for your Dhow Partners account." };

export default async function Help({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
      <HelpIndex articles={memberArticles} base="/help" q={q?.slice(0, 80)} title="How can we help?" sub="Step-by-step guides for your Dhow Partners account." />
    </div>
  );
}
