import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { keys } from "@/lib/env-alias";

// Know-your-business lookups against Kenya's Business Registration Service.
//   KYB_PROVIDER=manual    every request goes to a Dhow reviewer (default)
//   KYB_PROVIDER=smile_id  Smile ID business verification (needs the registered P.O. Box and postal code)
//   KYB_PROVIDER=dojah     Dojah Kenya business lookup (registration number only)
// A company is badged automatically only when the registry says it exists and the
// registered name matches the profile. Anything else goes to a person.

export type KybOutcome =
  | { status: "verified"; provider: string; ref: string; details: Record<string, unknown> }
  | { status: "needs_review"; provider: string; ref?: string; reason: string; details?: Record<string, unknown> };

export interface KybInput {
  orgId: string;
  companyName: string;
  registrationNumber: string;
  country: string;
  postalAddress?: string | null;
  postalCode?: string | null;
}

/** Compare names ignoring case, punctuation and words like "Limited". */
export const normName = (s: string) =>
  s.toUpperCase().replace(/&/g, "AND").replace(/\b(LIMITED|LTD|PLC|COMPANY|CO|THE)\b/g, "").replace(/[^A-Z0-9]/g, "");

function nameCheck(provider: string, ref: string, registeredName: string, input: KybInput, details: Record<string, unknown>): KybOutcome {
  if (!registeredName) return { status: "needs_review", provider, ref, reason: "The registry returned no company name", details };
  if (normName(registeredName) !== normName(input.companyName)) {
    return { status: "needs_review", provider, ref, reason: `Name on record is "${registeredName}"`, details };
  }
  return { status: "verified", provider, ref, details };
}

// ------------------------------------------------------------------ Smile ID
// Synchronous business verification, job_type 7. ResultCode 1012 = Business Verified,
// 1013 = not found, 1015 = registry unavailable, 1016 = product not activated.
async function smileId(input: KybInput): Promise<KybOutcome> {
  const partnerId = keys.smilePartnerId();
  const apiKey = keys.smileApiKey();
  if (!partnerId || !apiKey) return { status: "needs_review", provider: "smile_id", reason: "Smile ID is not configured" };
  if (!input.postalAddress || !input.postalCode) {
    return { status: "needs_review", provider: "smile_id", reason: "No P.O. Box or postal code on the profile, which Smile ID needs for Kenya" };
  }

  const base = process.env.SMILE_ID_ENV === "production" ? "https://api.smileidentity.com/v1" : "https://testapi.smileidentity.com/v1";
  const timestamp = new Date().toISOString();
  const signature = createHmac("sha256", apiKey).update(timestamp + partnerId + "sid_request").digest("base64");
  const jobId = `dhow-${randomUUID()}`;

  const r = await fetch(`${base}/business_verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      partner_id: partnerId,
      source_sdk: "rest_api",
      source_sdk_version: "1.0.0",
      timestamp,
      signature,
      country: "KE",
      id_type: "BUSINESS_REGISTRATION",
      id_number: input.registrationNumber,
      postal_address: input.postalAddress,
      postal_code: input.postalCode,
      partner_params: { job_id: jobId, user_id: input.orgId, job_type: 7 },
    }),
    cache: "no-store",
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  const code = String(j.ResultCode ?? "");
  const ref = String(j.SmileJobID ?? jobId);
  const info = (j.company_information ?? {}) as Record<string, unknown>;
  const details = { result_code: code, result_text: j.ResultText, company_information: info, directors: j.directors };

  if (code !== "1012") {
    const reason =
      code === "1013" ? "Smile ID couldn't find this registration number"
      : code === "1015" ? "The business registry was unavailable"
      : code === "1016" ? "Business verification isn't activated on the Smile ID account"
      : `Smile ID returned ${code || r.status}: ${String(j.ResultText ?? j.error ?? "no result")}`;
    return { status: "needs_review", provider: "smile_id", ref, reason, details };
  }
  const status = String(info.status ?? "").toLowerCase();
  if (status && !/registered|active|live/.test(status)) {
    return { status: "needs_review", provider: "smile_id", ref, reason: `Registry status is "${info.status}"`, details };
  }
  return nameCheck("smile_id", ref, String(info.legal_name ?? ""), input, details);
}

// ------------------------------------------------------------------ Dojah
function dojahType(reg: string) {
  const p = reg.toUpperCase();
  if (p.startsWith("BN")) return "bn";
  if (p.startsWith("LLP")) return "llp";
  return "pvt";
}

async function dojah(input: KybInput): Promise<KybOutcome> {
  const appId = keys.dojahAppId();
  const key = keys.dojahSecret();
  if (!appId || !key) return { status: "needs_review", provider: "dojah", reason: "Dojah is not configured" };
  // Sandbox keys only work on the sandbox host; default to it unless told otherwise.
  const base = (keys.dojahBaseUrl() || (key?.startsWith("test_") || process.env.DOJAH_ENV !== "production" ? "https://sandbox.dojah.io" : "https://api.dojah.io")).replace(/\/+$/, "");
  const q = new URLSearchParams({ registration_type: dojahType(input.registrationNumber), registration_number: input.registrationNumber });
  const r = await fetch(`${base}/api/v1/ke/kyb/business?${q}`, { headers: { Authorization: key, AppId: appId }, cache: "no-store" });
  const j = (await r.json().catch(() => ({}))) as { entity?: Record<string, unknown>; error?: string };
  const ref = `dojah-${randomUUID()}`;
  const e = j.entity;
  if (!r.ok || !e) return { status: "needs_review", provider: "dojah", ref, reason: j.error ? `Dojah: ${j.error}` : "No record returned", details: j as Record<string, unknown> };
  const status = String(e.status ?? "").toLowerCase();
  if (status && !/registered|active/.test(status)) return { status: "needs_review", provider: "dojah", ref, reason: `Registry status is "${e.status}"`, details: e };
  return nameCheck("dojah", ref, String(e.business_name ?? ""), input, e);
}

/** Which registry service runs: the one named in KYB_PROVIDER, otherwise whichever has keys set. */
export function kybProvider(): "smile_id" | "dojah" | "manual" {
  const named = (process.env.KYB_PROVIDER ?? "").trim().toLowerCase().replace(/[^a-z_]/g, "");
  if (named === "dojah" || named === "smile_id" || named === "smileid") return named === "smileid" ? "smile_id" : named;
  if (keys.dojahAppId() && keys.dojahSecret()) return "dojah";
  if (keys.smilePartnerId() && keys.smileApiKey()) return "smile_id";
  return "manual";
}

export async function verifyBusiness(input: KybInput): Promise<KybOutcome> {
  const provider = kybProvider();
  try {
    if (provider === "smile_id") return await smileId(input);
    if (provider === "dojah") return await dojah(input);
  } catch (e) {
    return { status: "needs_review", provider, reason: `Lookup failed: ${(e as Error).message}` };
  }
  return { status: "needs_review", provider: "manual", reason: "No verification service is switched on yet, so a person needs to check this one." };
}
