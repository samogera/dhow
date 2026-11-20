"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction, paystackConfigured } from "@/lib/paystack";
import { validInvoicePayToken } from "@/lib/payments";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/components/forms";

const In = z.object({ id: z.string().uuid(), t: z.string().min(10).max(64), email: z.string().trim().toLowerCase().email("Enter a valid email for your receipt.") });

/** Public: starts a Paystack checkout for the full balance of an invoice. The link token proves the payer has the invoice. */
export async function payInvoice(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = In.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form." };
  if (!validInvoicePayToken(p.data.id, p.data.t)) return { error: "This payment link isn't valid." };
  if (!paystackConfigured()) return { error: "Online payment isn't available yet. Please pay by bank transfer or M-Pesa as shown on the invoice." };
  if (!(await rateLimit("invoice-pay", 10, 600))) return { error: "Too many attempts. Please wait a few minutes." };

  const { data: inv } = await createAdminClient().from("invoices").select("id, number, status, total_kes, paid_kes").eq("id", p.data.id).maybeSingle();
  if (!inv || inv.status === "cancelled") return { error: "This invoice can't be paid online." };
  const balance = Number(inv.total_kes) - Number(inv.paid_kes);
  if (balance <= 0) return { ok: "This invoice is already paid. Thank you." };

  let url: string;
  try {
    const t = await initializeTransaction({
      email: p.data.email,
      amountKes: balance,
      reference: `INV-${inv.id}-${Date.now().toString(36)}`,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${inv.id}?t=${p.data.t}`,
      metadata: { purpose: "invoice", invoice_id: inv.id, invoice_number: inv.number },
    });
    url = t.authorization_url;
  } catch {
    return { error: "Paystack couldn't start the payment. Please try again." };
  }
  redirect(url);
}
