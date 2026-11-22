import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadInvoice } from "@/lib/invoices";
import { loadIssuer } from "@/lib/dhow-profile";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { paystackConfigured } from "@/lib/paystack";
import { invoicePayUrl } from "@/lib/payments";

export const runtime = "nodejs";

/** A client downloads one of their own invoices from their private page. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token) || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const db = createAdminClient();
  const { data: c } = await db.from("clients").select("id").eq("portal_token", token).maybeSingle();
  const inv = c ? await loadInvoice(db, id) : null;
  if (!c || !inv || inv.client_id !== c.id || inv.status === "draft") return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const pdf = await renderInvoicePdf(inv, await loadIssuer(), paystackConfigured() ? invoicePayUrl(inv.id) : undefined);
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Dhow-Partners-Invoice-${inv.number}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error("client invoice pdf failed", e);
    return new NextResponse("Could not make the PDF. Please contact hello@dhowpartners.com.", { status: 500 });
  }
}
