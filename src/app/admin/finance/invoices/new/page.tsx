import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { loadIssuer } from "@/lib/dhow-profile";
import { InvoiceBuilder } from "./builder";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoice({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const s = await requireStaff(["finance"]);
  const { client } = await searchParams;
  const [{ data: clients }, { data: projects }, { data: items }, issuer] = await Promise.all([
    s.supabase.from("clients").select("id, name, email, country").order("name"),
    s.supabase.from("projects").select("id, name, client_id, fee_kes").order("created_at", { ascending: false }),
    s.supabase.from("invoice_items").select("description, unit_price_kes").limit(300),
    loadIssuer(),
  ]);
  // Past line items, newest price first, for quick fill.
  const seen = new Set<string>();
  const past = (items ?? []).filter((i) => { const k = i.description.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 40).map((i) => ({ description: i.description, unit_price_kes: Number(i.unit_price_kes) }));
  return (
    <>
      <PageHeader title="New invoice" sub="Three quick steps. The preview on the right is exactly what the client receives." />
      <InvoiceBuilder clients={clients ?? []} projects={projects ?? []} past={past} issuer={issuer} defaultClient={client} />
    </>
  );
}
