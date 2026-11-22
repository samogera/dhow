import "server-only";
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { channelLabel, verifyTransaction } from "@/lib/paystack";
import { queueVerificationPaid } from "@/lib/inngest";
import { notifyStaff } from "@/lib/notify";
import { kes } from "@/lib/format";
import { safeEqual } from "@/lib/crypto";
import { appUrl } from "@/lib/app-url";

// Paystack references: "DV-<payment id>" for verification fees, "INV-<invoice id>-<time>" for client invoices.

export type ConfirmResult = { state: "paid" | "pending" | "failed" | "unknown"; message: string; receipt?: string };

/** Confirms a Paystack payment with Paystack itself and records it. Safe to call many times (return page, webhook, nightly job). */
export async function confirmPaystack(reference: string): Promise<ConfirmResult> {
  if (!/^(DV|INV)-[A-Za-z0-9-]{8,80}$/.test(reference)) return { state: "unknown", message: "Unknown payment reference." };
  const tx = await verifyTransaction(reference).catch(() => null);
  if (!tx) return { state: "pending", message: "We couldn't reach Paystack just now. Your payment will show here shortly." };
  return reference.startsWith("DV-") ? confirmVerificationFee(reference, tx) : confirmInvoicePayment(reference, tx);
}

async function confirmVerificationFee(reference: string, tx: Awaited<ReturnType<typeof verifyTransaction>>): Promise<ConfirmResult> {
  const db = createAdminClient();
  const { data: pay } = await db.from("payments").select("id, amount_kes, status, mpesa_receipt, reference_id").eq("checkout_request_id", reference).maybeSingle();
  if (!pay) return { state: "unknown", message: "We couldn't find that payment." };
  if (pay.status === "paid") return { state: "paid", message: "Payment received.", receipt: pay.mpesa_receipt ?? undefined };
  if (pay.status !== "pending") return { state: "failed", message: "This payment didn't go through. Please try again." };

  if (tx.status === "success") {
    // Flag a second successful fee for the same verification so finance can refund it.
    if (pay.reference_id) {
      const { count } = await db.from("payments").select("id", { count: "exact", head: true }).eq("reference_id", pay.reference_id).eq("status", "paid");
      if ((count ?? 0) > 0) await notifyStaff(["finance", "admin"], "Possible double verification payment", [`A second verification fee was paid (reference ${reference}).`, "Check it and refund the member if needed."]).catch(() => undefined);
    }
    if (tx.currency !== "KES" || tx.amount < pay.amount_kes * 100) {
      await db.from("payments").update({ status: "failed", result_desc: `Amount mismatch: ${tx.amount / 100} ${tx.currency}`, raw: tx }).eq("id", pay.id).eq("status", "pending");
      return { state: "failed", message: "The amount paid didn't match. Please contact us." };
    }
    const receipt = `PSK-${tx.id}`;
    const { data: updated } = await db.from("payments")
      .update({ status: "paid", mpesa_receipt: receipt, paid_at: tx.paid_at ?? new Date().toISOString(), result_desc: `${channelLabel(tx.channel)} via Paystack`, raw: tx })
      .eq("id", pay.id).eq("status", "pending").select("id");
    if (updated?.length) await queueVerificationPaid(pay.id);
    return { state: "paid", message: "Payment received. We're checking your company's registration now.", receipt };
  }
  if (["failed", "abandoned", "reversed"].includes(tx.status)) {
    await db.from("payments").update({ status: tx.status === "abandoned" ? "cancelled" : "failed", result_desc: tx.gateway_response ?? tx.status, raw: tx }).eq("id", pay.id).eq("status", "pending");
    return { state: "failed", message: tx.status === "abandoned" ? "The payment was cancelled." : `Payment failed: ${tx.gateway_response ?? "please try again"}.` };
  }
  return { state: "pending", message: "Your payment is still processing. This page will update when it's confirmed." };
}

async function confirmInvoicePayment(reference: string, tx: Awaited<ReturnType<typeof verifyTransaction>>): Promise<ConfirmResult> {
  if (tx.status !== "success") {
    return ["failed", "abandoned", "reversed"].includes(tx.status)
      ? { state: "failed", message: tx.status === "abandoned" ? "The payment was cancelled." : `Payment failed: ${tx.gateway_response ?? "please try again"}.` }
      : { state: "pending", message: "Your payment is still processing." };
  }
  if (tx.currency !== "KES") return { state: "failed", message: "Unexpected currency. Please contact us." };
  const invoiceId = reference.slice(4, 40);
  const db = createAdminClient();
  const receipt = `PSK-${tx.id}`;
  const { data: existing } = await db.from("invoice_payments").select("id").eq("reference", receipt).maybeSingle();
  if (existing) return { state: "paid", message: "Payment received. Thank you.", receipt };

  const { data: inv } = await db.from("invoices").select("id, number, status, total_kes, paid_kes").eq("id", invoiceId).maybeSingle();
  if (!inv) return { state: "unknown", message: "We couldn't find that invoice." };
  const amount = tx.amount / 100;
  const { error } = await db.from("invoice_payments").insert({
    invoice_id: inv.id, amount_kes: amount, method: `Paystack · ${channelLabel(tx.channel)}`, reference: receipt,
    paid_on: (tx.paid_at ?? new Date().toISOString()).slice(0, 10),
  });
  // A unique index on Paystack references makes a race between the webhook and the return page harmless.
  if (error && error.code !== "23505") return { state: "pending", message: "Payment received; we're recording it now." };
  if (!error) {
    // Paid twice (two tabs, or a retry after a dropped connection): tell finance so they can refund.
    if (Number(inv.paid_kes) >= Number(inv.total_kes)) {
      await notifyStaff(["finance", "admin"], `Possible double payment on invoice ${inv.number}`, [`A further ${kes(amount)} came in through Paystack after the invoice was already fully paid.`, `Reference: ${receipt}. Check it and refund the client if needed.`],
        { label: "Open invoice", href: `${appUrl()}/admin/finance/invoices/${inv.id}` }).catch(() => undefined);
    }
    if (inv.status === "draft") await db.from("invoices").update({ status: "sent" }).eq("id", inv.id).eq("status", "draft");
    await notifyStaff(["finance", "admin"], `Invoice ${inv.number} paid online`, [`${kes(amount)} received by ${channelLabel(tx.channel)} through Paystack.`, `Reference: ${receipt}`],
      { label: "Open invoice", href: `${appUrl()}/admin/finance/invoices/${inv.id}` }).catch(() => undefined);
  }
  return { state: "paid", message: "Payment received. Thank you.", receipt };
}

// ------------------------------------------------------------------ invoice pay links
// A pay link carries a signature of the invoice id, so invoice ids can't be guessed into pay pages.
const linkKey = () => process.env.DATA_ENCRYPTION_KEY ?? "";

export function invoicePayToken(invoiceId: string) {
  return createHmac("sha256", linkKey()).update(`pay:${invoiceId}`).digest("base64url").slice(0, 32);
}
export function validInvoicePayToken(invoiceId: string, token: string) {
  return Boolean(linkKey()) && safeEqual(invoicePayToken(invoiceId), token);
}
export function invoicePayUrl(invoiceId: string) {
  return `${appUrl()}/pay/${invoiceId}?t=${invoicePayToken(invoiceId)}`;
}
