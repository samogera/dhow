import { NextResponse } from "next/server";
import { staffOrNull } from "@/lib/auth";
import { analyticsSummary } from "@/lib/analytics";

export const runtime = "nodejs";

/** Analytics report as a designed PDF, or an Excel workbook with one tab per table. */
export async function GET(req: Request) {
  const s = await staffOrNull();
  if (!s) return NextResponse.json({ error: "Staff only." }, { status: 403 });
  const format = new URL(req.url).searchParams.get("format") === "xlsx" ? "xlsx" : "pdf";
  const a = await analyticsSummary(s.supabase);
  const stamp = new Date().toISOString().slice(0, 10);
  try {
    if (format === "pdf") {
      const { renderAnalyticsPdf } = await import("@/lib/analytics-report");
      const pdf = await renderAnalyticsPdf(a);
      return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="dhow-members-report-${stamp}.pdf"`, "Cache-Control": "private, no-store" } });
    }
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Dhow Partners";
    const NAVY = "FF00395F";
    const sheet = (name: string, cols: { header: string; key: string; width: number; numFmt?: string }[], rows: Record<string, unknown>[]) => {
      const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
      ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width, style: c.numFmt ? { numFmt: c.numFmt } : {} }));
      ws.getRow(1).eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; });
      ws.getRow(1).height = 20;
      rows.forEach((r) => ws.addRow(r));
      return ws;
    };
    sheet("Summary", [{ header: "Measure", key: "label", width: 28 }, { header: "Value", key: "value", width: 12 }, { header: "Note", key: "note", width: 32 }],
      [{ label: `Report date`, value: a.generated, note: "" }, ...a.kpis.map((k) => ({ ...k, value: Number(k.value) }))]);
    sheet("By month", [{ header: "Month", key: "label", width: 12 }, { header: "New companies", key: "members", width: 16 }, { header: "Applications", key: "applications", width: 14 }], a.months);
    const breakdown = (rows: { label: string; value: number }[]) => { const t = rows.reduce((n, r) => n + r.value, 0) || 1; return rows.map((r) => ({ ...r, share: r.value / t })); };
    const bcols = (h: string) => [{ header: h, key: "label", width: 24 }, { header: "Companies", key: "value", width: 12 }, { header: "Share", key: "share", width: 10, numFmt: "0%" }];
    sheet("Verification", bcols("Status"), breakdown(a.verification));
    sheet("Plans", bcols("Plan"), breakdown(a.plans));
    sheet("Sectors", bcols("Sector"), breakdown(a.sectors));
    sheet("Top opportunities", [{ header: "Opportunity", key: "title", width: 60 }, { header: "Kind", key: "kind", width: 12 }, { header: "Companies", key: "companies", width: 12 }, { header: "Won", key: "won", width: 8 }], a.top);
    sheet("Not applied yet", [{ header: "Company", key: "name", width: 36 }, { header: "Joined", key: "joined", width: 14 }, { header: "Verification", key: "verification", width: 16 }], a.notApplied);
    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buf as ArrayBuffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="dhow-members-report-${stamp}.xlsx"`, "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error("analytics export failed", e);
    return new NextResponse(`Could not make the report: ${e instanceof Error ? e.message : String(e)}`, { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
