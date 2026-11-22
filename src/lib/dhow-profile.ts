import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** What an invoice needs to know about us. Falls back to sensible defaults if the profile is empty. */
export interface Issuer {
  name: string; trading: string; address: string | null; postal: string | null; email: string | null; phone: string | null; website: string | null;
  kra_pin: string | null; logo_url: string | null;
  bank: { name: string | null; account_name: string | null; account_no: string | null; branch: string | null; swift: string | null };
  paybill: { number: string | null; account: string | null };
  terms: string | null;
}

export async function loadIssuer(): Promise<Issuer> {
  const { data: d } = await createAdminClient().from("dhow_profile").select("*").eq("id", 1).maybeSingle();
  return {
    name: d?.legal_name ?? "Dhow Partners Limited",
    trading: d?.trading_name || d?.legal_name || "Dhow Partners",
    address: d?.address ?? "Nairobi, Kenya",
    postal: d?.postal_address ?? null,
    email: d?.email ?? "hello@dhowpartners.com",
    phone: d?.phone ?? null,
    website: (d?.website ?? "https://dhowpartners.com").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""),
    kra_pin: d?.kra_pin ?? null,
    logo_url: d?.logo_url ?? null,
    bank: { name: d?.bank_name ?? null, account_name: d?.bank_account_name ?? null, account_no: d?.bank_account_no ?? null, branch: d?.bank_branch ?? null, swift: d?.bank_swift ?? null },
    paybill: { number: d?.paybill ?? null, account: d?.paybill_account ?? null },
    terms: d?.invoice_terms ?? null,
  };
}
