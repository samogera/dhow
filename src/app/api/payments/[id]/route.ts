import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/** Polled by the payment screen. RLS limits it to the company's own payments. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const { data } = await s.supabase.from("payments").select("status, result_desc, mpesa_receipt").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
