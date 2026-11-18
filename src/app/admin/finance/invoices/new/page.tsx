import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { InvoiceBuilder } from "./builder";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoice({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const s = await requireStaff(["finance"]);
  const { client } = await searchParams;
  const [{ data: clients }, { data: projects }] = await Promise.all([
    s.supabase.from("clients").select("id, name, email").order("name"),
    s.supabase.from("projects").select("id, name, client_id, fee_kes").order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader title="New invoice" sub="Fill in the details on the left and check the preview on the right." />
      <InvoiceBuilder clients={clients ?? []} projects={projects ?? []} defaultClient={client} />
    </>
  );
}
