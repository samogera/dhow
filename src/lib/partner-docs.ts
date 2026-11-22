/** Documents we ask partners for. The key is stored as the file's category. Only the two groups below are a must. */
export const PARTNER_DOCS = [
  { key: "incorporation", label: "Certificate of incorporation", required: false },
  { key: "cr12", label: "CR12 (current directors and shareholders)", required: false },
  { key: "tax_compliance", label: "Tax compliance certificate", required: false, expires: true },
  { key: "kra_pin", label: "KRA PIN certificate", required: false },
  { key: "company_profile", label: "Company profile", required: false },
  { key: "license", label: "Professional licence or practising certificate", required: false, expires: true },
  { key: "agreement", label: "Signed partnership agreement", required: false },
] as const;

/** A partner needs one document from each group. */
export const REQUIRED_GROUPS = [
  { label: "Certificate of incorporation or CR12", keys: ["incorporation", "cr12"] },
  { label: "Tax compliance certificate or KRA PIN", keys: ["tax_compliance", "kra_pin"] },
] as const;
export const groupOf = (key: string) => REQUIRED_GROUPS.find((g) => (g.keys as readonly string[]).includes(key));

export const FILE_CATEGORY_KEYS = ["incorporation", "cr12", "kra_pin", "tax_compliance", "company_profile", "license", "agreement", "certificate", "registration", "tax", "contract", "other"] as const;
export const docLabel = (key: string) => PARTNER_DOCS.find((d) => d.key === key)?.label ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Which must-have groups are still missing (or only expired copies). */
export function missingDocs(files: { category: string; expires_on: string | null }[]) {
  const today = new Date().toISOString().slice(0, 10);
  const current = (key: string) => files.some((f) => f.category === key && (!f.expires_on || f.expires_on >= today));
  return REQUIRED_GROUPS.filter((g) => !g.keys.some(current));
}
