import { NextResponse } from "next/server";
import { staffOrNull } from "@/lib/auth";
import { loadInvoice } from "@/lib/invoices";
import { renderInvoicePdf } from "@/lib/invoice-pdf";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await staffOrNull(["finance"]);
  if (!s) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const { id } = await params;
  const inv = await loadInvoice(s.supabase, id);
  if (!inv) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const pdf = await renderInvoicePdf(inv);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Dhow-Partners-Invoice-${inv.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
