import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { ClientWork } from "@/components/client-work";
import { atLeast } from "@/lib/plans";

export const metadata: Metadata = { title: "Our work" };

/** Enterprise members see the projects, tasks, invoices and payments Dhow runs for them. */
export default async function OurWork() {
  const { org } = await requireMember();
  if (!atLeast(org, "enterprise")) {
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
  const { data: client } = await createAdminClient().from("clients").select("id, portal_token").eq("org_id", org.id).order("created_at").limit(1).maybeSingle();
  return (
    <>
      <PageHeader title="Our work" sub="Your projects with Dhow, how far along they are, and your invoices." />
      {client ? (
        <div className="mx-auto max-w-4xl space-y-5"><ClientWork clientId={client.id} token={client.portal_token} /></div>
      ) : (
        <div className="card mx-auto max-w-xl text-center">
          <p className="text-lg font-semibold">Your work will show here</p>
          <p className="mt-1 text-sm text-muted">Once your setup plan is agreed, your account lead adds your projects and you can follow them here.</p>
        </div>
      )}
    </>
  );
}
