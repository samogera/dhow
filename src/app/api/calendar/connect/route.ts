import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { staffOrNull } from "@/lib/auth";
import { authUrl, calendarConfigured } from "@/lib/calendar";
import { randomToken } from "@/lib/crypto";

export async function GET() {
  const s = await staffOrNull();
  if (!s) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!calendarConfigured()) return NextResponse.json({ error: "Google Calendar isn't configured." }, { status: 503 });
  const state = randomToken(24);
  (await cookies()).set("gcal_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/calendar" });
  return NextResponse.redirect(authUrl(state));
}
