import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTACT_TOPICS } from "@/lib/investors";
import { ContactForm } from "./form";

export const metadata: Metadata = { title: "Contact Dhow Partners", robots: { index: false } };

export default async function InvestorContact({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ topic?: string }> }) {
  const { token } = await params;
  const { topic } = await searchParams;
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) notFound();
  const db = createAdminClient();
  const { data: inv } = await db.from("investors").select("id, name, contact_name, contact_role, email, active, deletion_requested_at").eq("portal_token", token).maybeSingle();
  if (!inv || !inv.active || inv.deletion_requested_at) notFound();
  const { data: set } = await db.from("investor_settings").select("phone").eq("investor_id", inv.id).maybeSingle();

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 pt-5 sm:px-5 sm:pt-7">
        <img src="/brand/wordmark-navy.png" alt="Dhow Partners" className="h-5 w-auto sm:h-6" />
        <Link href={`/investor/${token}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:underline"><ArrowLeft className="size-4" />Back to your page</Link>
      </header>
      <main className="mx-auto max-w-3xl px-3 py-6 sm:px-5 sm:py-10">
        <p className="px-2 text-sm text-muted sm:px-0">For {inv.name}</p>
        <h1 className="mt-1 px-2 text-2xl font-semibold tracking-tight sm:px-0 sm:text-3xl">Talk to Dhow Partners</h1>
        <p className="mt-2 max-w-xl px-2 text-sm text-muted sm:px-0">Questions, challenges or ideas: tell us and the team will get back to you, usually within one working day.</p>
        <ContactForm
          token={token}
          topics={CONTACT_TOPICS}
          startTopic={topic && topic in CONTACT_TOPICS ? topic : null}
          me={{ organisation: inv.name, name: inv.contact_name ?? "", role: inv.contact_role ?? "", email: inv.email ?? "", phone: set?.phone ?? "" }}
        />
      </main>
    </div>
  );
}
