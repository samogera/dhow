import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { ClientWork } from "@/components/client-work";
import { ClientReviewForm } from "@/app/client/[token]/review";
import { atLeast } from "@/lib/plans";

export const metadata: Metadata = { title: "Our work" };

/** Enterprise members see the projects, tasks, invoices and payments Dhow runs for them. */
export default async function OurWork() {
  const { org } = await requireMember();
  const db = createAdminClient();
  const { data: client } = await db.from("clients").select("id, portal_token").eq("org_id", org.id).order("created_at").limit(1).maybeSingle();
  if (!client && !atLeast(org, "enterprise")) {
    return (
      <>
        <PageHeader title="Our work" />
        <div className="card mx-auto max-w-xl text-center">
          <p className="text-lg font-semibold">Part of Enterprise</p>
          <p className="mt-1 text-sm text-muted">On Enterprise (Market Entry), Dhow runs your setup and you follow every project, task, invoice and payment here.</p>
          <Link href="/app/plans" className="mt-5 inline-block rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white">See plans</Link>
        </div>
      </>
    );
  }
  const { data: links } = client ? await db.from("client_partners").select("service, partners(name, logo_url, review_token)").eq("client_id", client.id) : { data: null };
  const partners = (links ?? []) as unknown as { service: string | null; partners: { name: string; logo_url: string | null; review_token: string | null } | null }[];
  const { data: reviewed } = client ? await db.from("client_reviews").select("id").eq("client_id", client.id).limit(1) : { data: null };
  return (
    <>
      <PageHeader title="Our work" sub="Your projects with Dhow, how far along they are, and your invoices." />
      {client ? (
        <div className="mx-auto max-w-4xl space-y-5">
          <ClientWork clientId={client.id} token={client.portal_token} />
          {partners.length ? (
            <section className="card">
              <h2 className="text-lg font-semibold">Partners on your work</h2>
              <p className="mt-1 text-sm text-muted">Firms Dhow brought in for you. Tell us how they did.</p>
              <ul className="mt-4 divide-y divide-line">
                {partners.map((p, i) => p.partners ? (
                  <li key={i} className="flex items-center gap-3 py-3">
                    {p.partners.logo_url ? <img src={p.partners.logo_url} alt="" className="size-10 rounded-xl bg-white object-contain ring-1 ring-line" /> : <span className="grid size-10 place-items-center rounded-xl bg-navy-50 font-semibold text-navy-700">{p.partners.name[0]}</span>}
                    <div className="min-w-0 flex-1"><p className="font-medium">{p.partners.name}</p>{p.service ? <p className="text-xs text-muted">{p.service}</p> : null}</div>
                    {p.partners.review_token ? <a href={`/review/${p.partners.review_token}`} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-line px-3 py-1.5 text-sm font-medium hover:bg-sunken">Review</a> : null}
                  </li>
                ) : null)}
              </ul>
            </section>
          ) : null}
          {client.portal_token ? (
            <section className="card">
              <h2 className="text-lg font-semibold">{reviewed?.length ? "Thank you for your review" : "How are we doing?"}</h2>
              <p className="mt-1 text-sm text-muted">Your honest feedback on Dhow helps us improve.</p>
              <div className="mt-5"><ClientReviewForm token={client.portal_token} /></div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="card mx-auto max-w-xl text-center">
          <p className="text-lg font-semibold">Your work will show here</p>
          <p className="mt-1 text-sm text-muted">Once your setup plan is agreed, your account lead adds your projects and you can follow them here.</p>
        </div>
      )}
    </>
  );
}
