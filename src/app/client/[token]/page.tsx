import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadIssuer } from "@/lib/dhow-profile";
import { ClientReviewForm } from "./review";
import { ClientWork } from "@/components/client-work";
import { HelpForm } from "@/components/help-form";

export const metadata: Metadata = { title: "Your work with Dhow Partners", robots: { index: false } };

export default async function ClientPortal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) notFound();
  const db = createAdminClient();
  const { data: c } = await db.from("clients").select("id, name, email, phone").eq("portal_token", token).maybeSingle();
  if (!c) notFound();
  const [{ data: reviews }, issuer] = await Promise.all([
    db.from("client_reviews").select("id").eq("client_id", c.id).limit(1),
    loadIssuer(),
  ]);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 pt-8">
        <img src="/brand/wordmark-navy.png" alt="Dhow Partners" className="h-6 w-auto" />
        <a href={`mailto:${issuer.email ?? "hello@dhowpartners.com"}`} className="text-sm font-medium text-navy-600">Contact us</a>
      </header>
      <main className="mx-auto max-w-4xl space-y-5 px-5 py-10">
        <div>
          <p className="text-sm text-muted">Your work with Dhow Partners</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-navy-900">{c.name}</h1>
        </div>

        <ClientWork clientId={c.id} token={token} />

        <section className="card">
          <h2 className="text-lg font-semibold">{reviews?.length ? "Thank you for your review" : "How are we doing?"}</h2>
          <p className="mt-1 text-sm text-muted">Your honest feedback helps us improve.</p>
          <div className="mt-5"><ClientReviewForm token={token} /></div>
        </section>

        <section className="card">
          <HelpForm
            side="client"
            token={token}
            email={c.email}
            phone={c.phone}
            title="Need something from us?"
            links={issuer.phone ? [{ label: "WhatsApp", href: `https://wa.me/${issuer.phone.replace(/\D/g, "")}` }, { label: "Call", href: `tel:${issuer.phone}` }] : undefined}
          />
        </section>
      </main>
    </div>
  );
}
