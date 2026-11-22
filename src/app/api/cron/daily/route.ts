import { NextResponse } from "next/server";
import { classifyOpportunities, enrichImported, importAllSources, retireExpired } from "@/lib/opportunity-import";
import { dailyMaintenance, deadlineReminders, invoiceReminders } from "@/lib/workflows";
import { rateLimit } from "@/lib/rate-limit";
import { safeEqual } from "@/lib/crypto";
import { sendMorningAlerts, sendWeeklyOpportunities } from "@/lib/notify";

export const maxDuration = 60;

// Vercel Cron calls this once a day (see vercel.json). With CRON_SECRET set, Vercel sends it as a
// bearer token and nothing else gets in; without it, the route still only runs once per hour.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (secret ? !safeEqual(auth, `Bearer ${secret}`) : !(await rateLimit("cron-daily", 1, 3600))) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const retired = await retireExpired().catch(() => 0);
  const opportunities = await importAllSources().catch((e) => [{ error: String(e) }]);
  const enriched = await enrichImported(15).catch(() => 0);
  await classifyOpportunities().catch(() => 0);
  await dailyMaintenance().catch(() => undefined);
  await deadlineReminders().catch(() => undefined);
  const invoiceReminderEmails = await invoiceReminders().catch(() => 0);
  const alertEmails = await sendMorningAlerts().catch(() => 0);
  const isMonday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Africa/Nairobi" }).format(new Date()) === "Mon";
  if (isMonday) await sendWeeklyOpportunities().catch(() => 0);
  return NextResponse.json({ ok: true, retired, opportunities, enriched, alertEmails, invoiceReminderEmails });
}
