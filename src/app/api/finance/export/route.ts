import { NextResponse } from "next/server";
import { staffOrNull } from "@/lib/auth";

export const runtime = "nodejs";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Quote, and stop spreadsheet formulas from running.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};
const csv = (head: string[], rows: unknown[][]) => "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");

/** Finance downloads as CSV (opens in Excel and Google Sheets): invoices, payments received, or partner bills. */
export async function GET(req: Request) {
  const s = await staffOrNull(["finance"]);
  if (!s) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "invoices";
  const from = url.searchParams.get("from") ?? "2000-01-01";
  const to = url.searchParams.get("to") ?? "2999-12-31";
  const db = s.supabase;
  let body = "";
  if (kind === "payments") {
    const { data } = await db.from("invoice_payments").select("paid_on, amount_kes, method, reference, invoices(number, clients(name))").gte("paid_on", from).lte("paid_on", to).order("paid_on");
    body = csv(["Date", "Client", "Invoice", "Amount (KES)", "Method", "Reference"], (data ?? []).map((p) => {
      const inv = p.invoices as unknown as { number: string; clients: { name: string } | null } | null;
      return [p.paid_on, inv?.clients?.name, inv?.number, Number(p.amount_kes).toFixed(2), p.method, p.reference];
    }));
  } else if (kind === "bills") {
    const { data } = await db.from("bills").select("description, amount_kes, paid_kes, due_date, status, partners(name)").order("due_date");
    body = csv(["Bill", "Partner", "Due", "Amount (KES)", "Paid (KES)", "Balance (KES)", "Status"], (data ?? []).map((b) => [
      b.description, (b.partners as unknown as { name: string } | null)?.name, b.due_date, Number(b.amount_kes).toFixed(2), Number(b.paid_kes).toFixed(2), (Number(b.amount_kes) - Number(b.paid_kes)).toFixed(2), b.status,
    ]));
  } else {
    const { data } = await db.from("invoices").select("number, issue_date, due_date, status, subtotal_kes, vat_kes, total_kes, paid_kes, clients(name)").gte("issue_date", from).lte("issue_date", to).order("issue_date");
    body = csv(["Invoice", "Client", "Issued", "Due", "Status", "Subtotal (KES)", "VAT (KES)", "Total (KES)", "Paid (KES)", "Balance (KES)"], (data ?? []).map((i) => [
      i.number, (i.clients as unknown as { name: string } | null)?.name, i.issue_date, i.due_date, i.status, Number(i.subtotal_kes).toFixed(2), Number(i.vat_kes).toFixed(2),
      Number(i.total_kes).toFixed(2), Number(i.paid_kes).toFixed(2), (Number(i.total_kes) - Number(i.paid_kes)).toFixed(2),
    ]));
  }
  const name = `dhow-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" } });
}
