import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvoiceForPdf } from "@/lib/invoice-pdf";

/** Load an invoice with its client and items. Uses the caller's client, so RLS applies. */
export async function loadInvoice(db: SupabaseClient, id: string): Promise<(InvoiceForPdf & { id: string; status: string; client_id: string }) | null> {
  const { data } = await db
    .from("invoices")
    .select("id, number, status, client_id, issue_date, due_date, vat_rate, subtotal_kes, vat_kes, total_kes, paid_kes, notes, clients(name, email, country), invoice_items(description, quantity, unit_price_kes, sort)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as Record<string, any>;
  return {
    id: row.id,
    status: row.status,
    client_id: row.client_id,
    number: row.number,
    issue_date: row.issue_date,
    due_date: row.due_date,
    vat_rate: Number(row.vat_rate),
    subtotal_kes: Number(row.subtotal_kes),
    vat_kes: Number(row.vat_kes),
    total_kes: Number(row.total_kes),
    paid_kes: Number(row.paid_kes),
    notes: row.notes,
    client: row.clients,
    items: [...row.invoice_items]
      .sort((a: { sort: number }, b: { sort: number }) => a.sort - b.sort)
      .map((i: Record<string, unknown>) => ({ description: String(i.description), quantity: Number(i.quantity), unit_price_kes: Number(i.unit_price_kes) })),
  };
}
