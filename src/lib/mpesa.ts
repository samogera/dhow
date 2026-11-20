import "server-only";
import { appUrl } from "@/lib/app-url";

// Safaricom Daraja: Lipa na M-Pesa Online (STK push).
// Docs: https://developer.safaricom.co.ke

const base = () =>
  process.env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

export function mpesaConfigured() {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_CALLBACK_SECRET,
  );
}

/** 0712 345 678, +254712345678, 254712345678 → 254712345678. Returns null if not a Kenyan mobile. */
export function normalizeKenyanPhone(input: string): string | null {
  const d = input.replace(/\D/g, "");
  const local = d.startsWith("254") ? d.slice(3) : d.startsWith("0") ? d.slice(1) : d;
  return /^(7|1)\d{8}$/.test(local) ? `254${local}` : null;
}

let cached: { token: string; until: number } | null = null;
async function token() {
  if (cached && cached.until > Date.now()) return cached.token;
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const r = await fetch(`${base()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Daraja auth failed (${r.status})`);
  const j = (await r.json()) as { access_token: string; expires_in: string };
  cached = { token: j.access_token, until: Date.now() + (Number(j.expires_in) - 60) * 1000 };
  return j.access_token;
}

function stamp() {
  // YYYYMMDDHHmmss in Nairobi time
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}${g("month")}${g("day")}${g("hour")}${g("minute")}${g("second")}`;
}

function password(ts: string) {
  return Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${ts}`).toString("base64");
}

export async function stkPush(opts: { phone: string; amount: number; reference: string; description: string }) {
  const ts = stamp();
  const callback = `${appUrl()}/api/payments/callback?key=${encodeURIComponent(process.env.MPESA_CALLBACK_SECRET!)}`;
  const r = await fetch(`${base()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password(ts),
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(opts.amount),
      PartyA: opts.phone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: opts.phone,
      CallBackURL: callback,
      AccountReference: opts.reference.slice(0, 12),
      TransactionDesc: opts.description.slice(0, 13),
    }),
    cache: "no-store",
  });
  const j = (await r.json()) as {
    ResponseCode?: string; CheckoutRequestID?: string; MerchantRequestID?: string;
    CustomerMessage?: string; errorMessage?: string;
  };
  if (!r.ok || j.ResponseCode !== "0") throw new Error(j.errorMessage ?? j.CustomerMessage ?? "M-Pesa request failed");
  return { checkoutRequestId: j.CheckoutRequestID!, merchantRequestId: j.MerchantRequestID! };
}

/** Ask Daraja for the result of a push whose callback never arrived. */
export async function stkQuery(checkoutRequestId: string) {
  const ts = stamp();
  const r = await fetch(`${base()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password(ts),
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    }),
    cache: "no-store",
  });
  const j = (await r.json()) as { ResultCode?: string; ResultDesc?: string; errorCode?: string };
  return { resultCode: j.ResultCode ?? null, resultDesc: j.ResultDesc ?? j.errorCode ?? "" };
}

export interface StkResult {
  checkoutRequestId: string;
  merchantRequestId: string;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  receipt?: string;
  phone?: string;
}

export function parseCallback(body: unknown): StkResult | null {
  const cb = (body as { Body?: { stkCallback?: Record<string, unknown> } })?.Body?.stkCallback;
  if (!cb || typeof cb.CheckoutRequestID !== "string") return null;
  const items = ((cb.CallbackMetadata as { Item?: { Name: string; Value?: string | number }[] })?.Item) ?? [];
  const v = (n: string) => items.find((i) => i.Name === n)?.Value;
  return {
    checkoutRequestId: cb.CheckoutRequestID,
    merchantRequestId: String(cb.MerchantRequestID ?? ""),
    resultCode: Number(cb.ResultCode),
    resultDesc: String(cb.ResultDesc ?? ""),
    amount: v("Amount") !== undefined ? Number(v("Amount")) : undefined,
    receipt: v("MpesaReceiptNumber") !== undefined ? String(v("MpesaReceiptNumber")) : undefined,
    phone: v("PhoneNumber") !== undefined ? String(v("PhoneNumber")) : undefined,
  };
}
