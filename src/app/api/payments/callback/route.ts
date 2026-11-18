import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCallback } from "@/lib/mpesa";
import { safeEqual } from "@/lib/crypto";
import { queueVerificationPaid } from "@/lib/inngest";

// Safaricom posts the STK result here. Daraja expects a fast 200 every time.
const ack = () => NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

export async function POST(req: Request) {
  const key = new URL(req.url).searchParams.get("key") ?? "";
  const secret = process.env.MPESA_CALLBACK_SECRET ?? "";
  if (!secret || !safeEqual(key, secret)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const result = parseCallback(body);
  if (!result) return ack();

  const db = createAdminClient();
  const { data: pay } = await db
    .from("payments")
    .select("id, purpose, amount_kes, status")
    .eq("checkout_request_id", result.checkoutRequestId)
    .maybeSingle();
  if (!pay || pay.status !== "pending") return ack(); // unknown or already processed: idempotent

  if (result.resultCode === 0) {
    if ((result.amount ?? 0) < pay.amount_kes) {
      await db.from("payments").update({ status: "failed", result_desc: `Underpaid: ${result.amount}`, raw: body }).eq("id", pay.id).eq("status", "pending");
      return ack();
    }
    // The status guard makes a repeated callback a no-op.
    const { data: updated } = await db
      .from("payments")
      .update({ status: "paid", mpesa_receipt: result.receipt, paid_at: new Date().toISOString(), result_desc: result.resultDesc, raw: body })
      .eq("id", pay.id)
      .eq("status", "pending")
      .select("id");
    if (updated?.length && pay.purpose === "verification") await queueVerificationPaid(pay.id);
  } else {
    await db
      .from("payments")
      .update({ status: result.resultCode === 1032 ? "cancelled" : "failed", result_desc: result.resultDesc, raw: body })
      .eq("id", pay.id)
      .eq("status", "pending");
  }
  return ack();
}
