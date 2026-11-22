import { createAdminClient } from "@/lib/supabase/admin";
import { feedEvents } from "@/lib/calendar-feed";
import { buildIcs } from "@/lib/ics";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Private calendar subscription. The token in the link is the only key, so it can be reset from the Calendar page. */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/i, "");
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) return new Response("Not found", { status: 404 });
  if (!(await rateLimit(`ics:${token}`, 120, 3600))) return new Response("Too many requests", { status: 429 });
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("id, staff_role").eq("calendar_token", token).maybeSingle();
  if (!p?.staff_role) return new Response("Not found", { status: 404 });
  const money = p.staff_role === "admin" || p.staff_role === "finance";
  const body = buildIcs("Dhow Partners · deadlines", await feedEvents(p.id, money));
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="dhow-deadlines.ics"',
      "Cache-Control": "private, max-age=900",
      "X-Robots-Tag": "noindex",
    },
  });
}
