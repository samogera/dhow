/** Documents we ask every partner for. The key is stored as the file's category. */
export const PARTNER_DOCS = [
  { key: "incorporation", label: "Certificate of incorporation", required: true },
  { key: "cr12", label: "CR12 (current directors and shareholders)", required: true },
  { key: "kra_pin", label: "KRA PIN certificate", required: true },
  { key: "tax_compliance", label: "Tax compliance certificate", required: true, expires: true },
  { key: "company_profile", label: "Company profile", required: true },
  { key: "license", label: "Professional licence or practising certificate", required: false, expires: true },
  { key: "agreement", label: "Signed partnership agreement", required: false },
] as const;

export const FILE_CATEGORY_KEYS = ["incorporation", "cr12", "kra_pin", "tax_compliance", "company_profile", "license", "agreement", "certificate", "registration", "tax", "contract", "other"] as const;
export const docLabel = (key: string) => PARTNER_DOCS.find((d) => d.key === key)?.label ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Which required documents are still missing (or expired). */
export function missingDocs(files: { category: string; expires_on: string | null }[]) {
  const today = new Date().toISOString().slice(0, 10);
  return PARTNER_DOCS.filter((d) => d.required && !files.some((f) => f.category === d.key && (!f.expires_on || f.expires_on >= today)));
}
