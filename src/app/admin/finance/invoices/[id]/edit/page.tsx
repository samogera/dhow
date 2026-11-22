import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { loadIssuer } from "@/lib/dhow-profile";
import { InvoiceBuilder } from "../../new/builder";

export const metadata: Metadata = { title: "Edit invoice" };

export default async function EditInvoice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await requireStaff(["finance"]);
  const [{ data: inv }, { data: items }, { data: clients }, { data: projects }, issuer] = await Promise.all([
    s.supabase.from("invoices").select("id, number, status, client_id, project_id, issue_date, due_date, vat_rate, notes").eq("id", id).maybeSingle(),
    s.supabase.from("invoice_items").select("description, quantity, unit_price_kes, sort").eq("invoice_id", id).order("sort"),
    s.supabase.from("clients").select("id, name, email, country").order("name"),
    s.supabase.from("projects").select("id, name, client_id, fee_kes").order("created_at", { ascending: false }),
    loadIssuer(),
  ]);
  if (!inv || inv.status === "cancelled") notFound();
  return (
    <>
      <Link href={`/admin/finance/invoices/${id}`} className="text-sm text-muted hover:text-ink">← Invoice {inv.number}</Link>
      <PageHeader title={`Edit invoice ${inv.number}`} sub="Fix the client, dates, VAT or lines. Payments already recorded stay as they are." />
      <InvoiceBuilder clients={clients ?? []} projects={projects ?? []} past={[]} issuer={issuer} initial={{
        id: inv.id, number: inv.number, client_id: inv.client_id, project_id: inv.project_id, issue: inv.issue_date, due: inv.due_date, vat: Number(inv.vat_rate), notes: inv.notes ?? "",
        lines: (items ?? []).map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price_kes: Number(i.unit_price_kes) })),
      }} />
    </>
  );
}
