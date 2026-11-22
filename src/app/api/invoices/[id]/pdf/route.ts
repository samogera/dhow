import { NextResponse } from "next/server";
import { staffOrNull } from "@/lib/auth";
import { loadInvoice } from "@/lib/invoices";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { loadIssuer } from "@/lib/dhow-profile";
import { paystackConfigured } from "@/lib/paystack";
import { invoicePayUrl } from "@/lib/payments";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await staffOrNull(["finance"]);
  if (!s) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const { id } = await params;
  const inv = await loadInvoice(s.supabase, id);
  if (!inv) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let pdf: Buffer;
  try {
    pdf = await renderInvoicePdf(inv, await loadIssuer(), inv.status !== "draft" && paystackConfigured() ? invoicePayUrl(inv.id) : undefined);
  } catch (e) {
    console.error("invoice pdf failed", e);
    return new NextResponse(`Could not make the PDF: ${e instanceof Error ? e.message : String(e)}`, { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Dhow-Partners-Invoice-${inv.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
