import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { staffOrNull } from "@/lib/auth";
import { authUrl, providerConfigured, type CalendarProvider } from "@/lib/calendar";
import { randomToken } from "@/lib/crypto";

export async function GET(req: Request) {
  const s = await staffOrNull();
  if (!s) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const provider: CalendarProvider = new URL(req.url).searchParams.get("provider") === "microsoft" ? "microsoft" : "google";
  if (!providerConfigured(provider)) return NextResponse.redirect(new URL("/admin/calendar?error=config", process.env.NEXT_PUBLIC_APP_URL));
  const state = randomToken(24);
  (await cookies()).set("cal_state", `${provider}:${state}`, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/calendar" });
  return NextResponse.redirect(authUrl(provider, state));
}
