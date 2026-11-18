import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { staffOrNull } from "@/lib/auth";
import { exchangeCode } from "@/lib/calendar";
import { safeEqual } from "@/lib/crypto";

export async function GET(req: Request) {
  const s = await staffOrNull();
  const url = new URL(req.url);
  const done = (q: string) => NextResponse.redirect(new URL(`/admin/calendar?${q}`, process.env.NEXT_PUBLIC_APP_URL));
  if (!s) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const jar = await cookies();
  const expected = jar.get("gcal_state")?.value ?? "";
  jar.delete({ name: "gcal_state", path: "/api/calendar" });
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  if (!expected || !safeEqual(state, expected) || !code) return done("error=state");

  try {
    await exchangeCode(s.user.id, code);
    return done("connected=1");
  } catch {
    return done("error=google");
  }
}
