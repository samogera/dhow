import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { HelpIndex } from "@/components/help";
import { staffArticles } from "@/content/help";

export const metadata: Metadata = { title: "Staff guides" };

export default async function StaffHelp({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const { q } = await searchParams;
  return (
    <HelpIndex articles={staffArticles} base="/admin/help" q={q?.slice(0, 80)} title="Staff guides" sub="How to run the Dhow workspace, step by step."
      extra={<p className="mt-10 text-sm text-muted">Looking for what members see? Read the <Link href="/help" className="font-medium text-navy-600 underline">member guides</Link>.</p>} />
  );
}
