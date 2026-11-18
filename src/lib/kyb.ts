import "server-only";
import { createHmac, randomUUID } from "node:crypto";

// Know-your-business lookups. "manual" sends every request to a Dhow reviewer.
// "smile_id" calls Smile ID's business verification API.
// Confirm the request and response fields against your Smile ID contract and
// docs before going live; providers change these.

export type KybOutcome =
  | { status: "verified"; provider: string; ref: string; details: Record<string, unknown> }
  | { status: "needs_review"; provider: string; ref?: string; reason: string; details?: Record<string, unknown> };

export interface KybInput {
  orgId: string;
  companyName: string;
  registrationNumber: string;
  country: string;
}

const norm = (s: string) => s.toUpperCase().replace(/\b(LIMITED|LTD|PLC|COMPANY|CO)\b/g, "").replace(/[^A-Z0-9]/g, "");

async function smileId(input: KybInput): Promise<KybOutcome> {
  const partnerId = process.env.SMILE_ID_PARTNER_ID;
  const apiKey = process.env.SMILE_ID_API_KEY;
  if (!partnerId || !apiKey) return { status: "needs_review", provider: "smile_id", reason: "Smile ID is not configured" };

  const base = process.env.SMILE_ID_ENV === "production" ? "https://api.smileidentity.com/v1" : "https://testapi.smileidentity.com/v1";
  const timestamp = new Date().toISOString();
  const signature = createHmac("sha256", apiKey).update(timestamp + partnerId + "sid_request").digest("base64");
  const jobId = randomUUID();

  const r = await fetch(`${base}/business_verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      partner_id: partnerId,
      timestamp,
      signature,
      country: "KE",
      id_type: "BUSINESS_REGISTRATION",
      id_number: input.registrationNumber,
      partner_params: { job_id: jobId, user_id: input.orgId, job_type: 7 },
    }),
    cache: "no-store",
  });

  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  const info = (j.company_information ?? j.business_information) as Record<string, unknown> | undefined;
  if (!r.ok || !info) {
    return { status: "needs_review", provider: "smile_id", ref: jobId, reason: "No record returned", details: j };
  }
  const registeredName = String(info.legal_name ?? info.name ?? "");
  if (norm(registeredName) !== norm(input.companyName)) {
    return { status: "needs_review", provider: "smile_id", ref: jobId, reason: `Name on record is "${registeredName}"`, details: info };
  }
  return { status: "verified", provider: "smile_id", ref: jobId, details: info };
}

export async function verifyBusiness(input: KybInput): Promise<KybOutcome> {
  if (process.env.KYB_PROVIDER === "smile_id") {
    try {
      return await smileId(input);
    } catch (e) {
      return { status: "needs_review", provider: "smile_id", reason: `Lookup failed: ${(e as Error).message}` };
    }
  }
  return { status: "needs_review", provider: "manual", reason: "Manual review" };
}
