import type { z } from "zod";

// Field names as people see them on the forms.
const LABELS: Record<string, string> = {
  name: "Name", industry: "Industry", discipline: "Main contact or focus", address: "Address", about: "Company profile",
  commission_terms: "Agreement terms", notes: "Notes", contract_notes: "Contract notes", contract_date: "Contract date",
  website: "Website", email: "Email", phone: "Phone", agreed_pct: "Default percentage", services: "Services",
  description: "Description", title: "Title", amount: "Amount", due_on: "Due date", issued_on: "Date", payee: "Paid to",
  mission: "Mission", vision: "Vision", promises: "Promises", audience: "Who we serve", tagline: "Tagline",
  legal_name: "Legal name", trading_name: "Trading name", full_name: "Name", role: "Role", label: "File name",
  apply_url: "Application link", dhow_note: "Why it matters", body: "Text", comment: "Comment",
};
const human = (key: string) => LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Turns the first validation problem into a sentence that names the field, e.g. "Agreement terms is too long: 362 characters, the limit is 300." */
export function friendlyError(e: z.ZodError, values?: Record<string, unknown>): { error: string } {
  const i = e.issues[0];
  if (!i) return { error: "Check the form and try again." };
  const key = String(i.path[0] ?? "");
  const field = key ? human(key) : "";
  const raw = i as unknown as { code: string; maximum?: number | bigint; minimum?: number | bigint; type?: string; origin?: string };
  const issue = { ...raw, type: raw.type ?? raw.origin, maximum: raw.maximum != null ? Number(raw.maximum) : undefined, minimum: raw.minimum != null ? Number(raw.minimum) : undefined };
  // Messages written by us (not zod's defaults) are kept as they are.
  if (!/^(String|Number|Expected|Invalid|Required)/.test(i.message)) return { error: i.message };
  if (issue.code === "too_big" && issue.type === "string") {
    const have = typeof values?.[key] === "string" ? (values[key] as string).trim().length : null;
    return { error: `${field || "A field"} is too long${have ? `: ${have} characters` : ""}. The limit is ${issue.maximum}.` };
  }
  if (issue.code === "too_small" && issue.type === "string") return { error: issue.minimum === 1 ? `Fill in ${field || "the required field"}.` : `${field || "A field"} needs at least ${issue.minimum} characters.` };
  if (issue.code === "too_big") return { error: `${field || "A number"} can be at most ${issue.maximum}.` };
  if (issue.code === "too_small") return { error: `${field || "A number"} must be at least ${issue.minimum}.` };
  if (issue.code === "invalid_string" || issue.code === "invalid_format") return { error: `${field || "A field"} doesn't look right. Check it and try again.` };
  if (issue.code === "invalid_enum_value" || issue.code === "invalid_value") return { error: `Choose an option for ${field || "the field"}.` };
  return { error: field ? `Check ${field}.` : "Check the form and try again." };
}
