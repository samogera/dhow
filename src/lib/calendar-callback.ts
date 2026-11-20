import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { staffOrNull } from "@/lib/auth";
import { exchangeCode, type CalendarProvider } from "@/lib/calendar";
import { safeEqual } from "@/lib/crypto";

/** Shared OAuth callback: checks the state cookie, stores the calendar connection, returns to /admin/calendar. */
export async function handleCalendarCallback(req: Request, provider: CalendarProvider) {
  const s = await staffOrNull();
  const url = new URL(req.url);
  const done = (q: string) => NextResponse.redirect(new URL(`/admin/calendar?${q}`, process.env.NEXT_PUBLIC_APP_URL));
  if (!s) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const jar = await cookies();
  const saved = jar.get("cal_state")?.value ?? "";
  jar.delete({ name: "cal_state", path: "/api/calendar" });
  const [savedProvider, expected] = saved.split(":");
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  if (savedProvider !== provider || !expected || !safeEqual(state, expected) || !code) return done("error=state");

  try {
    await exchangeCode(provider, s.user.id, code);
    return done(`connected=${provider}`);
  } catch {
    return done(`error=${provider}`);
  }
}
