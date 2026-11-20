import "server-only";
import { createHmac } from "node:crypto";
import { safeEqual } from "@/lib/crypto";

// Paystack: hosted checkout with M-Pesa and card, in KES.
// Amounts go to Paystack in cents (KES x 100). Every payment is confirmed by
// calling Paystack's verify endpoint; we never trust the browser or the webhook body alone.

const API = "https://api.paystack.co";
const secret = () => process.env.PAYSTACK_SECRET_KEY ?? "";

export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

/** Which provider takes member payments: Paystack when its key is set, unless PAYMENT_PROVIDER says otherwise. */
export function paymentProvider(): "paystack" | "daraja" {
  const p = process.env.PAYMENT_PROVIDER;
  if (p === "daraja" || p === "paystack") return p;
  return paystackConfigured() ? "paystack" : "daraja";
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const j = (await r.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!r.ok || !j.status || !j.data) throw new Error(j.message ?? `Paystack error ${r.status}`);
  return j.data;
}

export async function initializeTransaction(input: {
  email: string;
  amountKes: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  return call<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountKes * 100),
      currency: "KES",
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ["mobile_money", "card"],
      metadata: input.metadata ?? {},
    }),
  });
}

export interface PaystackTransaction {
  id: number;
  status: "success" | "failed" | "abandoned" | "ongoing" | "pending" | "processing" | "queued" | "reversed";
  reference: string;
  amount: number; // cents
  currency: string;
  channel?: string;
  gateway_response?: string;
  paid_at?: string | null;
  metadata?: Record<string, unknown> | string | null;
}

export async function verifyTransaction(reference: string) {
  return call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Webhooks are signed with HMAC-SHA512 of the raw body using the secret key. */
export function validWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature || !secret()) return false;
  const expected = createHmac("sha512", secret()).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export function channelLabel(channel?: string) {
  return channel === "mobile_money" ? "M-Pesa" : channel === "card" ? "Card" : channel ? channel.replace(/_/g, " ") : "Online";
}
