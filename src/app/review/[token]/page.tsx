import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CenteredShell } from "@/components/centered-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewForm } from "./form";

export const metadata: Metadata = { title: "Leave a review", robots: { index: false } };

export default async function Review({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) notFound();
  const { data: p } = await createAdminClient().from("partners").select("name, logo_url").eq("review_token", token).maybeSingle();
  if (!p) notFound();
  return (
    <CenteredShell>
      <p className="label text-center">Dhow Partners · client review</p>
      <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight text-navy-900">How did {p.name} do?</h1>
      <p className="mt-2 text-center text-sm text-muted">Your review goes to the Dhow Partners team and helps us choose who we work with.</p>
      <div className="mt-8"><ReviewForm token={token} /></div>
    </CenteredShell>
  );
}
