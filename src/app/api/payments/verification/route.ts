import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgAdmin, memberOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mpesaConfigured, normalizeKenyanPhone, stkPush } from "@/lib/mpesa";
import { rateLimit } from "@/lib/rate-limit";
import { initializeTransaction, paymentProvider, paystackConfigured } from "@/lib/paystack";
import { appUrl } from "@/lib/app-url";

const Body = z.object({ phone: z.string().min(9).max(16) });

/** Starts an instant verification: creates the request, then sends the member to Paystack checkout (M-Pesa or card), or an M-Pesa STK push when Daraja is the provider. */
export async function POST(req: Request) {
  const m = await memberOrNull();
  if (!m) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!isOrgAdmin(m.role)) return NextResponse.json({ error: "Only company owners and admins can pay." }, { status: 403 });
  const provider = paymentProvider();
  if (provider === "paystack" ? !paystackConfigured() : !mpesaConfigured()) return NextResponse.json({ error: "Online payments aren't switched on yet. Use free verification for now." }, { status: 503 });
  if (!(await rateLimit("pay", 5, 600))) return NextResponse.json({ error: "Too many payment attempts. Try again in 10 minutes." }, { status: 429 });

  let phone = "";
  if (provider === "daraja") {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    phone = (parsed.success ? normalizeKenyanPhone(parsed.data.phone) : null) ?? "";
    if (!phone) return NextResponse.json({ error: "Enter a Safaricom number like 0712 345 678." }, { status: 400 });
  }

  const org = m.org;
  if (org.verification_status === "verified") return NextResponse.json({ error: "Your company is already verified." }, { status: 409 });
  if (!org.brs_number) return NextResponse.json({ error: "Add your BRS registration number in Settings first." }, { status: 400 });

  const db = createAdminClient();
  const fee = Number(process.env.VERIFICATION_FEE_KES ?? 500);

  // Reuse an open instant request rather than stacking new ones.
  let { data: v } = await db
    .from("verifications")
    .select("id, status")
    .eq("org_id", org.id)
    .eq("tier", "instant")
    .in("status", ["awaiting_payment", "pending", "in_review"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (v && v.status !== "awaiting_payment") return NextResponse.json({ error: "Your verification is already being processed." }, { status: 409 });
  if (!v) {
    const created = await db.from("verifications").insert({ org_id: org.id, tier: "instant", status: "awaiting_payment", requested_by: m.user.id }).select("id, status").single();
    v = created.data;
  }
  if (!v) return NextResponse.json({ error: "Could not start verification." }, { status: 500 });

  // A second tap must not start a second charge: wait while a payment from the last 3 minutes is still open.
  const { data: open } = await db
    .from("payments")
    .select("id")
    .eq("reference_id", v.id)
    .eq("status", "pending")
    .gte("created_at", new Date(Date.now() - 3 * 60 * 1000).toISOString())
    .limit(1)
    .maybeSingle();
  if (open) return NextResponse.json({ error: "A payment request is already open. Finish it on your phone or in the checkout tab, or try again in 3 minutes." }, { status: 409 });

  const { data: pay } = await db
    .from("payments")
    .insert({ org_id: org.id, purpose: "verification", reference_id: v.id, phone, amount_kes: fee, created_by: m.user.id })
    .select("id")
    .single();
  if (!pay) return NextResponse.json({ error: "Could not start payment." }, { status: 500 });

  if (provider === "paystack") {
    const reference = `DV-${pay.id}`;
    await db.from("payments").update({ checkout_request_id: reference }).eq("id", pay.id);
    try {
      const t = await initializeTransaction({
        email: m.user.email!,
        amountKes: fee,
        reference,
        callbackUrl: `${appUrl()}/app/verification`,
        metadata: { purpose: "verification", org_id: org.id, payment_id: pay.id, company: org.name },
      });
      return NextResponse.json({ url: t.authorization_url });
    } catch (e) {
      await db.from("payments").update({ status: "failed", result_desc: (e as Error).message }).eq("id", pay.id);
      return NextResponse.json({ error: "Paystack couldn't start the payment. Please try again." }, { status: 502 });
    }
  }

  try {
    const r = await stkPush({ phone, amount: fee, reference: "DHOWVERIFY", description: "Verification" });
    await db.from("payments").update({ checkout_request_id: r.checkoutRequestId, merchant_request_id: r.merchantRequestId }).eq("id", pay.id);
    return NextResponse.json({ paymentId: pay.id, message: "Check your phone and enter your M-Pesa PIN." });
  } catch (e) {
    await db.from("payments").update({ status: "failed", result_desc: (e as Error).message }).eq("id", pay.id);
    return NextResponse.json({ error: "M-Pesa didn't accept the request. Check the number and try again." }, { status: 502 });
  }
}
