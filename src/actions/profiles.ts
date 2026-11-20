"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isOrgAdmin, memberOrNull, staffOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFile, removeInternal, uploadImage, uploadInternal } from "@/lib/storage";
import { SOCIALS } from "@/lib/socials";
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
  category: z.enum(["certificate", "company_profile", "registration", "tax", "contract", "license", "other"]).default("other"),
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
