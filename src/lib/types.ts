export type StaffRole = "reviewer" | "finance" | "admin";
export type OrgRole = "owner" | "admin" | "member";
export type PlanTier = "free" | "starter" | "growth" | "market_entry";
export type VerificationState = "unverified" | "pending" | "verified" | "rejected" | "expired";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  staff_role: StaffRole | null;
}

export interface Organization {
  id: string;
  name: string;
  country: string;
  sector: string | null;
  website: string | null;
  brs_number: string | null;
  postal_address: string | null;
  postal_code: string | null;
  kra_pin_last4: string | null;
  plan: PlanTier;
  verification_status: VerificationState;
  verified_at: string | null;
  verified_until: string | null;
  storage_used_bytes: number;
  storage_reserved_bytes: number;
  created_at: string;
}

export const DOC_KINDS = {
  cr12: "CR12",
  certificate_of_incorporation: "Certificate of incorporation",
  kra_pin: "KRA PIN certificate",
  tax_compliance: "Tax compliance certificate",
  director_id: "Director ID",
  pitch_deck: "Pitch deck",
  other: "Other",
} as const;
export type DocKind = keyof typeof DOC_KINDS;

export const PLAN_LABEL: Record<PlanTier, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  market_entry: "Market Entry",
};

export const PLAN_PRICE_KES: Record<PlanTier, number | null> = {
  free: 0,
  starter: 1000,
  growth: 5000,
  market_entry: null,
};

export function storageCapBytes(plan: PlanTier, status: VerificationState): number {
  const MB = 1024 * 1024;
  switch (plan) {
    case "free":
      return status === "verified" ? 500 * MB : 50 * MB;
    case "starter":
      return 500 * MB;
    case "growth":
      return 2048 * MB;
    case "market_entry":
      return 10240 * MB;
  }
}

export const SECTORS = ["Agriculture", "Branding and merchandise", "Circular economy", "Education", "Energy", "Financial services", "Health", "Hospitality", "Manufacturing", "Technology", "Trade", "Other"];
export const COUNTRIES = ["Kenya", "Uganda", "Tanzania", "Rwanda", "United Kingdom", "United States", "United Arab Emirates", "India", "China", "Other"];
