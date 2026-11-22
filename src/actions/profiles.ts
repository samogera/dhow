"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { after } from "next/server";
import { notifyStaff } from "@/lib/notify";
import { appUrl } from "@/lib/app-url";
import { friendlyError } from "@/lib/form-errors";
import { isOrgAdmin, memberOrNull, staffOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFile, removeInternal, uploadImage } from "@/lib/storage";
import { SOCIALS } from "@/lib/socials";
import { rateLimit } from "@/lib/rate-limit";
import { randomBytes } from "node:crypto";
import type { ActionState } from "@/components/forms";

const DENIED: ActionState = { error: "You don't have access to do that." };
const text = (max = 500) => z.string().trim().max(max).optional().transform((v) => v || null);
const url = z.string().trim().max(300).optional().transform((v) => (v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : null));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null);
const year = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1900).max(2100).nullable());
const uuid = z.string().uuid();
const optUuid = z.string().uuid().optional().or(z.literal("")).transform((v) => v || null);
const first = (e: z.ZodError, values?: Record<string, unknown>) => friendlyError(e, values);
const form = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));

/** Reads social_* fields into { linkedin: "https://…", … }. Plain handles become links. */
function socialsFrom(fd: FormData) {
  const out: Record<string, string> = {};
  for (const s of SOCIALS) {
    const raw = String(fd.get(`social_${s.key}`) ?? "").trim().slice(0, 300);
    if (!raw) continue;
    if (/^https?:\/\//i.test(raw)) out[s.key] = raw;
    else if (s.key === "whatsapp") out[s.key] = `https://wa.me/${raw.replace(/\D/g, "").replace(/^0/, "254")}`;
    else out[s.key] = `${s.base}${raw.replace(/^@/, "")}`;
  }
  return out;
}

/** An uploaded image (logo/photo) replaces the old one; "remove_image" clears it. */
async function imageField(fd: FormData, folder: string, current: string | null): Promise<{ url: string | null } | { error: string }> {
  const f = fd.get("image");
  if (isFile(f)) {
    const r = await uploadImage(f, folder);
    return "error" in r ? r : { url: r.url };
  }
  return { url: fd.get("remove_image") === "on" ? null : current };
}

// ----------------------------------------------------------------- member company profile
const CompanyProfileIn = z.object({
  tagline: text(160), about: text(3000), phone: text(40), email: z.string().trim().email("Enter a valid email").max(160).optional().or(z.literal("")).transform((v) => v || null),
  address: text(300), founded_year: year, team_size: text(40),
});
export async function saveCompanyProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const m = await memberOrNull();
  if (!m || !isOrgAdmin(m.role)) return { error: "Only owners and admins can edit the company profile." };
  const values = form(fd);
  const p = CompanyProfileIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  const db = createAdminClient();
  const { data: cur } = await db.from("organizations").select("logo_url").eq("id", m.org.id).single();
  const img = await imageField(fd, `orgs/${m.org.id}`, cur?.logo_url ?? null);
  if ("error" in img) return img;
  const { error } = await db.from("organizations").update({ ...p.data, logo_url: img.url, socials: socialsFrom(fd) }).eq("id", m.org.id);
  if (error) return { error: error.message };
  revalidatePath("/app", "layout");
  return { ok: "Profile saved." };
}

// ----------------------------------------------------------------- partners
const PartnerIn = z.object({
  id: optUuid,
  name: z.string().trim().min(2).max(160),
  industry: text(120), discipline: text(120), address: text(300),
  relationship: z.enum(["service", "referral", "institution"]),
  status: z.enum(["vetting", "approved", "paused", "rejected"]),
  commission_terms: text(3000), website: url, email: text(160), phone: text(40), notes: text(4000),
  about: text(3000),
  agreed_pct: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0, "Percentage between 0 and 100").max(100, "Percentage between 0 and 100").nullable()).optional(),
  contract_status: z.enum(["none", "discussed", "sent", "signed", "ended"]).optional(),
  contract_date: date, contract_notes: text(3000),
});
/** Service rows from the form: names with an optional percentage each. */
function ratesFrom(fd: FormData): { service: string; pct: number | null }[] | { error: string } {
  const names = fd.getAll("rate_service").map((v) => String(v).trim().slice(0, 120));
  const pcts = fd.getAll("rate_pct").map((v) => String(v).trim());
  const out: { service: string; pct: number | null }[] = [];
  for (let i = 0; i < names.length && out.length < 30; i++) {
    if (!names[i]) continue;
    const pct = pcts[i] ? Number(pcts[i]) : null;
    if (pct != null && (!Number.isFinite(pct) || pct < 0 || pct > 100)) return { error: `Percentage for ${names[i]} must be between 0 and 100.` };
    if (out.some((r) => r.service.toLowerCase() === names[i].toLowerCase())) continue;
    out.push({ service: names[i], pct });
  }
  return out;
}
export async function savePartnerProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const values = form(fd);
  const p = PartnerIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  const { id, ...row } = p.data;
  const rates = ratesFrom(fd);
  if ("error" in rates) return rates;
  let current: string | null = null;
  if (id) current = (await s.supabase.from("partners").select("logo_url").eq("id", id).single()).data?.logo_url ?? null;
  const img = await imageField(fd, "partners", current);
  if ("error" in img) return img;
  const full = { ...row, service_rates: rates, services: rates.map((r) => r.service), logo_url: img.url, socials: socialsFrom(fd) };
  if (id) {
    const { error } = await s.supabase.from("partners").update(full).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/partners");
    return { ok: "Partner saved." };
  }
  const { data, error } = await s.supabase.from("partners").insert(full).select("id").single();
  if (error || !data) return { error: error?.message ?? "Could not save." };
  revalidatePath("/admin/partners");
  redirect(`/admin/partners/${data.id}`);
}

// ----------------------------------------------------------------- internal files (partner and Dhow documents)
export async function deleteInternalFile(fd: FormData) {
  const s = await staffOrNull(["admin"]);
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const { data } = await s.supabase.from("internal_files").delete().eq("id", id.data).select("object_path, owner_type, owner_id").single();
  if (data) await removeInternal(data.object_path);
  revalidatePath("/admin/partners", "layout");
  revalidatePath("/admin/company");
}

// ----------------------------------------------------------------- people (team, with or without a login)
const PersonIn = z.object({
  id: optUuid,
  full_name: z.string().trim().min(2, "Enter their name").max(120),
  title: text(120), department: text(80), email: text(160), phone: text(40), linkedin: url, bio: text(1500), started_on: date,
  active: z.enum(["on"]).optional().transform((v) => v === "on"),
});
export async function savePerson(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const values = form(fd);
  const p = PersonIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  const { id, ...row } = p.data;
  let current: string | null = null;
  if (id) current = (await s.supabase.from("team_people").select("photo_url").eq("id", id).single()).data?.photo_url ?? null;
  const img = await imageField(fd, "people", current);
  if ("error" in img) return img;
  const full = { ...row, active: id ? row.active : true, photo_url: img.url };
  const { error } = id ? await s.supabase.from("team_people").update(full).eq("id", id) : await s.supabase.from("team_people").insert(full);
  if (error) return { error: error.message };
  revalidatePath("/admin/team");
  return { ok: id ? "Saved." : `${row.full_name} added to the team.` };
}

export async function deletePerson(fd: FormData) {
  const s = await staffOrNull(["admin"]);
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  await s.supabase.from("team_people").delete().eq("id", id.data);
  revalidatePath("/admin/team");
}

// ----------------------------------------------------------------- Dhow's own profile
const DhowIn = z.object({
  legal_name: z.string().trim().min(2).max(160), trading_name: text(160), tagline: text(200), about: text(4000),
  registration_no: text(60), kra_pin: text(20), vat_no: text(40), founded_year: year,
  address: text(300), postal_address: text(120), email: text(160), phone: text(40), whatsapp: text(40),
  website: url, booking_link: url, bank_details: text(1000),
  bank_name: text(120), bank_account_name: text(160), bank_account_no: z.string().trim().max(40).regex(/^[\d\s-]*$/, "Account number: digits only").optional().transform((v) => v?.replace(/[\s-]/g, "") || null),
  bank_branch: text(120), bank_swift: text(20),
  paybill: z.string().trim().max(10).regex(/^\d*$/, "Paybill: digits only").optional().transform((v) => v || null),
  paybill_account: text(40), invoice_terms: text(300),
  mission: text(1000), vision: text(1000), promises: text(2000), audience: text(1000), services: text(3000),
});
export async function saveDhowProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull(["admin"]);
  if (!s) return { error: "Only admins can edit the Dhow profile." };
  const values = form(fd);
  const p = DhowIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  const { data: cur } = await s.supabase.from("dhow_profile").select("logo_url").eq("id", 1).single();
  const img = await imageField(fd, "dhow", cur?.logo_url ?? null);
  if ("error" in img) return img;
  const { error } = await s.supabase.from("dhow_profile").update({ ...p.data, logo_url: img.url, socials: socialsFrom(fd), updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/admin/company");
  return { ok: "Dhow profile saved." };
}

// ----------------------------------------------------------------- partner links (documents and client reviews, no login)
export async function makePartnerLink(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  const kind = fd.get("kind") === "review" ? "review_token" : "upload_token";
  if (!id.success) return;
  const fresh = fd.get("reset") === "1";
  const { data } = await s.supabase.from("partners").select(kind).eq("id", id.data).single();
  if (fresh || !(data as Record<string, string | null> | null)?.[kind]) {
    await s.supabase.from("partners").update({ [kind]: randomBytes(24).toString("base64url") }).eq("id", id.data);
  }
  revalidatePath(`/admin/partners/${id.data}`);
}

const token = z.string().regex(/^[A-Za-z0-9_-]{24,64}$/);

/** A partner uploads one of the requested documents through their private link. */
const ReviewIn = z.object({
  token, reviewer_name: z.string().trim().min(2, "Enter your name").max(120), reviewer_company: text(160),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5), comment: text(2000),
});
/** A client reviews a partner through the partner's review link. */
export async function submitPartnerReview(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = form(fd);
  const p = ReviewIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  if (!(await rateLimit(`partner-review:${p.data.token}`, 10, 3600))) return { error: "Too many reviews from this link. Try later." };
  const db = createAdminClient();
  const { data: partner } = await db.from("partners").select("id").eq("review_token", p.data.token).maybeSingle();
  if (!partner) return { error: "This review link isn't valid any more." };
  const { error } = await db.from("partner_reviews").insert({
    partner_id: partner.id, source: "link", reviewer_name: p.data.reviewer_name, reviewer_company: p.data.reviewer_company, rating: p.data.rating, comment: p.data.comment,
  });
  if (error) return { error: "Could not save your review. Try again." };
  revalidatePath(`/admin/partners/${partner.id}`);
  after(() => notifyStaff(["admin"], `New partner review: ${p.data.rating}/5`, [`${p.data.reviewer_name}${p.data.reviewer_company ? ` (${p.data.reviewer_company})` : ""} rated a partner ${p.data.rating} out of 5.`, ...(p.data.comment ? [`"${p.data.comment}"`] : [])],
    { label: "See the partner", href: `${appUrl()}/admin/partners/${partner.id}` }));
  return { ok: "Thank you. Your review has been sent to Dhow Partners." };
}

// ----------------------------------------------------------------- client page (no login)
export async function makeClientLink(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const { data } = await s.supabase.from("clients").select("portal_token").eq("id", id.data).single();
  if (fd.get("reset") === "1" || !data?.portal_token) {
    await s.supabase.from("clients").update({ portal_token: randomBytes(24).toString("base64url") }).eq("id", id.data);
  }
  revalidatePath(`/admin/clients/${id.data}`);
}

const ClientReviewIn = z.object({
  token, reviewer_name: z.string().trim().min(2, "Enter your name").max(120),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5), comment: text(2000),
  may_publish: z.enum(["on"]).optional().transform((v) => v === "on"),
});
export async function submitClientReview(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = form(fd);
  const p = ClientReviewIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  if (!(await rateLimit(`client-review:${p.data.token}`, 5, 3600))) return { error: "Too many reviews. Try later." };
  const db = createAdminClient();
  const { data: c } = await db.from("clients").select("id").eq("portal_token", p.data.token).maybeSingle();
  if (!c) return { error: "This link isn't valid any more." };
  const { error } = await db.from("client_reviews").insert({ client_id: c.id, reviewer_name: p.data.reviewer_name, rating: p.data.rating, comment: p.data.comment, may_publish: p.data.may_publish });
  if (error) return { error: "Could not save your review. Try again." };
  revalidatePath(`/admin/clients/${c.id}`);
  after(() => notifyStaff(["admin"], `New client review: ${p.data.rating}/5`, [`${p.data.reviewer_name} left a ${p.data.rating}-star review.`, ...(p.data.comment ? [`"${p.data.comment}"`] : [])],
    { label: "See the client", href: `${appUrl()}/admin/clients/${c.id}` }));
  return { ok: "Thank you for your review." };
}

// ----------------------------------------------------------------- ideas
const IdeaIn = z.object({ title: z.string().trim().min(3, "Give the idea a short title").max(200), details: text(4000) });
export async function addIdea(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const values = form(fd);
  const p = IdeaIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  const { error } = await s.supabase.from("ideas").insert({ ...p.data, author: s.user.id });
  if (error) return { error: error.message };
  revalidatePath("/admin/ideas");
  return { ok: "Idea shared with the team." };
}

export async function voteIdea(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const { data } = await s.supabase.from("idea_votes").select("idea_id").eq("idea_id", id.data).eq("user_id", s.user.id).maybeSingle();
  if (data) await s.supabase.from("idea_votes").delete().eq("idea_id", id.data).eq("user_id", s.user.id);
  else await s.supabase.from("idea_votes").insert({ idea_id: id.data, user_id: s.user.id });
  revalidatePath("/admin/ideas");
}

export async function commentIdea(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const p = z.object({ idea_id: uuid, body: z.string().trim().min(1, "Write a comment").max(2000) }).safeParse(form(fd));
  if (!p.success) return first(p.error);
  const { error } = await s.supabase.from("idea_comments").insert({ ...p.data, author: s.user.id });
  if (error) return { error: error.message };
  revalidatePath("/admin/ideas");
  return { ok: "Comment added." };
}

export async function setIdeaStatus(fd: FormData) {
  const s = await staffOrNull(["admin"]);
  if (!s) return;
  const p = z.object({ id: uuid, status: z.enum(["new", "discussing", "doing", "done", "parked"]) }).safeParse(form(fd));
  if (!p.success) return;
  await s.supabase.from("ideas").update({ status: p.data.status }).eq("id", p.data.id);
  revalidatePath("/admin/ideas");
}
