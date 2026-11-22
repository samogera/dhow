import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgAdmin, memberOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { initializeTransaction, paystackConfigured } from "@/lib/paystack";
import { priceOf, TIERS } from "@/lib/plans";
import { appUrl } from "@/lib/app-url";

const Body = z.object({ tier: z.enum(["basic", "premium"]), period: z.enum(["monthly", "yearly"]) });

/** Starts a Premium or Business membership payment (one month or one year) through Paystack checkout. */
export async function POST(req: Request) {
  const m = await memberOrNull();
  if (!m) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!isOrgAdmin(m.role)) return NextResponse.json({ error: "Only company owners and admins can change the plan." }, { status: 403 });
  if (!paystackConfigured()) return NextResponse.json({ error: "Online payments aren't switched on yet. Ask the Dhow team to upgrade you." }, { status: 503 });
  if (!(await rateLimit("pay", 5, 600))) return NextResponse.json({ error: "Too many payment attempts. Try again in 10 minutes." }, { status: 429 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Pick a plan." }, { status: 400 });
  const { tier, period } = p.data;
  const amount = priceOf(tier, period)!;

  const db = createAdminClient();
  const { data: open } = await db.from("payments").select("id").eq("org_id", m.org.id).eq("purpose", "subscription").eq("status", "pending")
    .gte("created_at", new Date(Date.now() - 3 * 60 * 1000).toISOString()).limit(1).maybeSingle();
  if (open) return NextResponse.json({ error: "A payment is already open. Finish it in the checkout tab, or try again in 3 minutes." }, { status: 409 });

  const { data: pay } = await db.from("payments")
    .insert({ org_id: m.org.id, purpose: "subscription", phone: "", amount_kes: amount, created_by: m.user.id, result_desc: `${TIERS[tier].name} ${period}` })
    .select("id").single();
  if (!pay) return NextResponse.json({ error: "Could not start payment." }, { status: 500 });

  // DM-<tier><period>-<payment id>: b/p for Basic/Premium, m/y for monthly/yearly.
  const reference = `DM-${tier[0]}${period[0]}-${pay.id}`;
  await db.from("payments").update({ checkout_request_id: reference }).eq("id", pay.id);
  try {
    const t = await initializeTransaction({
      email: m.user.email!,
      amountKes: amount,
      reference,
      callbackUrl: `${appUrl()}/app/plans`,
      metadata: { purpose: "membership", tier, period, org_id: m.org.id, payment_id: pay.id, company: m.org.name },
    });
    return NextResponse.json({ url: t.authorization_url });
  } catch (e) {
    await db.from("payments").update({ status: "failed", result_desc: (e as Error).message }).eq("id", pay.id);
    return NextResponse.json({ error: "Paystack couldn't start the payment. Please try again." }, { status: 502 });
  }
}
