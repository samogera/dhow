"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isOrgAdmin, memberOrNull, staffOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFile, removeInternal, uploadImage, uploadInternal } from "@/lib/storage";
import { SOCIALS } from "@/lib/socials";
import { FILE_CATEGORY_KEYS, PARTNER_DOCS } from "@/lib/partner-docs";
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
const first = (e: z.ZodError) => ({ error: e.issues[0]?.message ?? "Check the form." });
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
  const p = CompanyProfileIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
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
  commission_terms: text(300), website: url, email: text(160), phone: text(40), notes: text(4000),
  about: text(3000),
  agreed_pct: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0, "Percentage between 0 and 100").max(100, "Percentage between 0 and 100").nullable()).optional(),
  services: z.string().max(1000).optional().transform((v) => (v ?? "").split(/[,\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 20)),
});
export async function savePartnerProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const p = PartnerIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
  const { id, ...row } = p.data;
  let current: string | null = null;
  if (id) current = (await s.supabase.from("partners").select("logo_url").eq("id", id).single()).data?.logo_url ?? null;
  const img = await imageField(fd, "partners", current);
  if ("error" in img) return img;
  const full = { ...row, logo_url: img.url, socials: socialsFrom(fd) };
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
const FileIn = z.object({
  owner_type: z.enum(["partner", "dhow"]),
  owner_id: optUuid,
  label: z.string().trim().min(1, "Give the file a name").max(160),
  category: z.enum(FILE_CATEGORY_KEYS).default("other"),
  expires_on: date,
});
export async function uploadInternalFile(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const p = FileIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
  if (p.data.owner_type === "partner" && !p.data.owner_id) return { error: "Missing partner." };
  const f = fd.get("file");
  if (!isFile(f)) return { error: "Choose a file to upload." };
  const up = await uploadInternal(f, `${p.data.owner_type}/${p.data.owner_id ?? "dhow"}`);
  if ("error" in up) return up;
  const { error } = await s.supabase.from("internal_files").insert({
    ...p.data, file_name: up.name, object_path: up.path, mime_type: up.mime, size_bytes: up.size, uploaded_by: s.user.id,
  });
  if (error) { await removeInternal(up.path); return { error: error.message }; }
  revalidatePath(p.data.owner_type === "partner" ? `/admin/partners/${p.data.owner_id}` : "/admin/company");
  return { ok: "File uploaded." };
}

export async function deleteInternalFile(fd: FormData) {
  const s = await staffOrNull();
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
  const p = PersonIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
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
  const s = await staffOrNull();
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
  const p = DhowIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
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
export async function partnerUpload(_: ActionState, fd: FormData): Promise<ActionState> {
  const t = token.safeParse(fd.get("token"));
  if (!t.success) return { error: "This link isn't valid." };
  if (!(await rateLimit(`partner-upload:${t.data}`, 30, 3600))) return { error: "Too many uploads. Try again in an hour." };
  const db = createAdminClient();
  const { data: p } = await db.from("partners").select("id").eq("upload_token", t.data).maybeSingle();
  if (!p) return { error: "This link has expired. Ask Dhow Partners for a new one." };
  const doc = PARTNER_DOCS.find((d) => d.key === fd.get("category"));
  if (!doc) return { error: "Choose which document this is." };
  const expires = date.safeParse(fd.get("expires_on") ?? "");
  const f = fd.get("file");
  if (!isFile(f)) return { error: "Choose a file." };
  const up = await uploadInternal(f, `partner/${p.id}`);
  if ("error" in up) return up;
  const { error } = await db.from("internal_files").insert({
    owner_type: "partner", owner_id: p.id, label: doc.label, category: doc.key, file_name: up.name, object_path: up.path,
    mime_type: up.mime, size_bytes: up.size, expires_on: expires.success ? expires.data : null, uploaded_via: "partner_link",
  });
  if (error) { await removeInternal(up.path); return { error: "Could not save the file. Try again." }; }
  revalidatePath(`/partner/${t.data}`);
  revalidatePath(`/admin/partners/${p.id}`);
  return { ok: `${doc.label} uploaded. Thank you.` };
}

const ReviewIn = z.object({
  token, reviewer_name: z.string().trim().min(2, "Enter your name").max(120), reviewer_company: text(160),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5), comment: text(2000),
});
/** A client reviews a partner through the partner's review link. */
export async function submitPartnerReview(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = ReviewIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
  if (!(await rateLimit(`partner-review:${p.data.token}`, 10, 3600))) return { error: "Too many reviews from this link. Try later." };
  const db = createAdminClient();
  const { data: partner } = await db.from("partners").select("id").eq("review_token", p.data.token).maybeSingle();
  if (!partner) return { error: "This review link isn't valid any more." };
  const { error } = await db.from("partner_reviews").insert({
    partner_id: partner.id, source: "link", reviewer_name: p.data.reviewer_name, reviewer_company: p.data.reviewer_company, rating: p.data.rating, comment: p.data.comment,
  });
  if (error) return { error: "Could not save your review. Try again." };
  revalidatePath(`/admin/partners/${partner.id}`);
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
  const p = ClientReviewIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
  if (!(await rateLimit(`client-review:${p.data.token}`, 5, 3600))) return { error: "Too many reviews. Try later." };
  const db = createAdminClient();
  const { data: c } = await db.from("clients").select("id").eq("portal_token", p.data.token).maybeSingle();
  if (!c) return { error: "This link isn't valid any more." };
  const { error } = await db.from("client_reviews").insert({ client_id: c.id, reviewer_name: p.data.reviewer_name, rating: p.data.rating, comment: p.data.comment, may_publish: p.data.may_publish });
  if (error) return { error: "Could not save your review. Try again." };
  revalidatePath(`/admin/clients/${c.id}`);
  return { ok: "Thank you for your review." };
}
