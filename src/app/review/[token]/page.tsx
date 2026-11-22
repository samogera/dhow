import type { Metadata } from "next";
import { shareMeta } from "@/lib/share-meta";
import { notFound } from "next/navigation";
import { CenteredShell } from "@/components/centered-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewForm } from "./form";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const { data: p } = /^[A-Za-z0-9_-]{24,64}$/.test(token) ? await createAdminClient().from("partners").select("name").eq("review_token", token).maybeSingle() : { data: null };
  return shareMeta(p ? `Review ${p.name} · Dhow Partners` : "Leave a review · Dhow Partners",
    "Tell Dhow Partners how the work went. It takes a minute.", `/review/${token}`);
}

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
