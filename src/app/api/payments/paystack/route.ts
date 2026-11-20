import { NextResponse } from "next/server";
import { validWebhookSignature } from "@/lib/paystack";
import { confirmPaystack } from "@/lib/payments";

// Paystack webhook. The signature proves it came from Paystack; the payment itself
// is still re-checked with Paystack's verify API before anything is recorded.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validWebhookSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const event = JSON.parse(raw) as { event?: string; data?: { reference?: string } };
  const reference = event.data?.reference;
  if (reference && (event.event === "charge.success" || event.event === "charge.failed")) {
    await confirmPaystack(reference).catch(() => undefined);
  }
  return NextResponse.json({ received: true });
}
