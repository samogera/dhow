import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Email confirmation and password-reset links land here.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/app";
  // Only allow relative redirects, so the link can't send someone to another site.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
