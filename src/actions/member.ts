"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { ORG_COOKIE, isOrgAdmin, memberOrNull, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, randomToken, sha256 } from "@/lib/crypto";
import { normalizeKenyanPhone } from "@/lib/mpesa";
import { deleteObject } from "@/lib/r2";
import { emailLayout, notifyStaff, sendEmail } from "@/lib/notify";
import type { ActionState } from "@/components/forms";
import { appUrl } from "@/lib/app-url";
import { TIERS, tierOf } from "@/lib/plans";

const app = () => appUrl()!;
const optional = z.string().trim().max(200).optional().transform((v) => v || null);
const KRA_PIN = /^[AP]\d{9}[A-Z]$/;

const OrgInput = z.object({
  name: z.string().trim().min(2, "Enter the company name").max(160),
  country: z.string().trim().min(2).max(60).default("Kenya"),
  sector: optional,
  website: z.string().trim().max(200).optional().transform((v) => (v ? (v.startsWith("http") ? v : `https://${v}`) : null)),
  brs_number: z.string().trim().toUpperCase().max(40).optional().transform((v) => v || null),
  kra_pin: z.string().trim().toUpperCase().optional().transform((v) => v || null)
    .refine((v) => !v || KRA_PIN.test(v), "A KRA PIN looks like P051234567X"),
  // Kenya's business registry lookup needs the registered P.O. Box and postal code.
  postal_address: z.string().trim().optional().transform((v) => (v ? v.replace(/^p\.?\s*o\.?\s*box\s*/i, "").trim() || null : null))
    .refine((v) => !v || /^\d{1,6}$/.test(v), "Enter just the P.O. Box number, e.g. 12345"),
  postal_code: z.string().trim().optional().transform((v) => v || null)
    .refine((v) => !v || /^\d{5}$/.test(v), "A Kenyan postal code has 5 digits, e.g. 00100"),
});

export async function createOrganization(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireUser();
  const p = OrgInput.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const db = createAdminClient();
  const { kra_pin, ...rest } = p.data;
  const { data: org, error } = await db
    .from("organizations")
    .insert({ ...rest, kra_pin_enc: kra_pin ? encrypt(kra_pin) : null, kra_pin_last4: kra_pin ? kra_pin.slice(-4) : null, created_by: s.user.id })
    .select("id")
    .single();
  if (error || !org) return { error: "Could not create the company. Try again." };
  await db.from("memberships").insert({ org_id: org.id, user_id: s.user.id, role: "owner" });
  (await cookies()).set(ORG_COOKIE, org.id, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  const email = s.user.email;
  if (email) {
    const first = (s.profile?.full_name ?? "").split(" ")[0];
    const base = appUrl();
    after(() => sendEmail({ template: "welcome", to: email, subject: `Welcome to Dhow Partners${first ? `, ${first}` : ""}`,
      html: emailLayout(`Welcome to Dhow, ${first || "and thank you for joining"}`, [
        `${p.data.name} now has its own Dhow workspace. Here's how to get the most from it:`,
        "1. Tell us what you're looking for: your sector and the kinds of opportunity you want. We'll put the best fits first and email you new ones each Monday.",
        "2. Upload your company documents and get Dhow Verified, so partners and buyers know your records check out.",
        "3. Explore open opportunities: grants, programmes, tenders and events open to companies in Kenya, checked by our team.",
        "Questions, or want help setting up? Just reply to this email. A real person at Dhow will answer.",
      ], { label: "Open your workspace", href: `${base}/app` }) }).catch(() => undefined));
  }
  redirect("/app");
}

export async function updateOrganization(_: ActionState, fd: FormData): Promise<ActionState> {
  const m = await memberOrNull();
  if (!m || !isOrgAdmin(m.role)) return { error: "Only owners and admins can edit the company." };
  const p = OrgInput.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const { kra_pin, brs_number, postal_address, postal_code, ...rest } = p.data;

  const patch: Record<string, unknown> = { ...rest };
  // Fields not on the submitted form are left as they are (sector is set under "What should we look for?").
  if (!fd.has("sector")) delete patch.sector;
  if (!fd.has("website")) delete patch.website;
  // Registration details lock once verified, so a badge can't be moved to another company.
  if (m.org.verification_status !== "verified") {
    patch.brs_number = brs_number;
    patch.postal_address = postal_address;
    patch.postal_code = postal_code;
    if (kra_pin) {
      patch.kra_pin_enc = encrypt(kra_pin);
      patch.kra_pin_last4 = kra_pin.slice(-4);
    }
  }
  await createAdminClient().from("organizations").update(patch).eq("id", m.org.id);
  revalidatePath("/app", "layout");
  return { ok: "Saved." };
}

export async function switchOrganization(fd: FormData) {
  const s = await requireUser();
  const id = z.string().uuid().safeParse(fd.get("org_id"));
  if (!id.success) return;
  const { data } = await s.supabase.from("memberships").select("org_id").eq("org_id", id.data).eq("user_id", s.user.id).maybeSingle();
  if (data) (await cookies()).set(ORG_COOKIE, id.data, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/app");
}

export async function updateProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireUser();
  const name = z.string().trim().min(2).max(120).safeParse(fd.get("full_name"));
  if (!name.success) return { error: "Enter your name." };
  const rawPhone = String(fd.get("phone") ?? "").trim();
  const phone = rawPhone ? normalizeKenyanPhone(rawPhone) : null;
  if (rawPhone && !phone) return { error: "Enter a Kenyan mobile number like 0712 345 678." };
  await s.supabase.from("profiles").update({ full_name: name.data, phone }).eq("id", s.user.id);
  revalidatePath("/app/settings");
  return { ok: "Saved." };
}

export async function inviteMember(_: ActionState, fd: FormData): Promise<ActionState> {
  const m = await memberOrNull();
  if (!m || !isOrgAdmin(m.role)) return { error: "Only owners and admins can invite people." };
  const p = z.object({ email: z.string().trim().toLowerCase().email(), role: z.enum(["admin", "member"]) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Enter a valid email." };
  const token = randomToken();
  const db = createAdminClient();
  await db.from("invitations").insert({ org_id: m.org.id, email: p.data.email, role: p.data.role, token_hash: sha256(token), invited_by: m.user.id });
  await sendEmail({
    orgId: m.org.id,
    template: "invitation",
    to: p.data.email,
    subject: `Join ${m.org.name} on Dhow`,
    html: emailLayout(`Join ${m.org.name} on Dhow`, [`${m.profile.full_name || "A colleague"} invited you to ${m.org.name}'s workspace on Dhow Partners.`, "The link works for 7 days."], { label: "Accept the invitation", href: `${app()}/invite/${token}` }),
  });
  revalidatePath("/app/settings");
  return { ok: `Invitation sent to ${p.data.email}.` };
}

export async function acceptInvitation(fd: FormData) {
  const s = await requireUser();
  const token = String(fd.get("token") ?? "");
  const db = createAdminClient();
  const { data: inv } = await db.from("invitations").select("id, org_id, email, role, expires_at, accepted_at").eq("token_hash", sha256(token)).maybeSingle();
  if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date()) redirect("/invite/expired");
  if (inv.email.toLowerCase() !== (s.user.email ?? "").toLowerCase()) redirect("/invite/wrong-account");
  await db.from("memberships").upsert({ org_id: inv.org_id, user_id: s.user.id, role: inv.role });
  await db.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", inv.id);
  (await cookies()).set(ORG_COOKIE, inv.org_id, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/app");
}

export async function removeMember(fd: FormData) {
  const m = await memberOrNull();
  if (!m || !isOrgAdmin(m.role)) return;
  const userId = z.string().uuid().safeParse(fd.get("user_id"));
  if (!userId.success || userId.data === m.user.id) return;
  const db = createAdminClient();
  const { data: target } = await db.from("memberships").select("role").eq("org_id", m.org.id).eq("user_id", userId.data).maybeSingle();
  if (!target || (target.role === "owner" && m.role !== "owner")) return;
  await db.from("memberships").delete().eq("org_id", m.org.id).eq("user_id", userId.data);
  revalidatePath("/app/settings");
}

export async function deleteDocument(fd: FormData) {
  const m = await memberOrNull();
  if (!m || !isOrgAdmin(m.role)) return;
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const db = createAdminClient();
  const { data: doc } = await db.from("documents").select("id, org_id, object_key, size_bytes, status").eq("id", id.data).maybeSingle();
  if (!doc || doc.org_id !== m.org.id) return;
  if (doc.status === "approved" && m.org.verification_status === "verified") return; // keep evidence behind a live badge
  await deleteObject(doc.object_key).catch(() => undefined);
  const used = doc.status === "pending_upload" ? 0 : doc.size_bytes;
  const reserved = doc.status === "pending_upload" ? doc.size_bytes : 0;
  await db.rpc("release_storage", { p_org: doc.org_id, p_reserved: reserved, p_used: used });
  await db.from("documents").delete().eq("id", doc.id);
  revalidatePath("/app/documents");
}

export async function applyToOpportunity(_: ActionState, fd: FormData): Promise<ActionState> {
  const m = await memberOrNull();
  if (!m) return { error: "Sign in first." };
  const p = z.object({ opportunity_id: z.string().uuid(), note: z.string().trim().max(2000).optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Something's missing." };
  const tier = TIERS[tierOf(m.org)];
  if (tier.applications !== null) {
    const monthStart = `${new Date().toISOString().slice(0, 7)}-01T00:00:00Z`;
    const { count } = await m.supabase.from("applications").select("id", { count: "exact", head: true }).eq("org_id", m.org.id).gte("created_at", monthStart);
    if ((count ?? 0) >= tier.applications) return { error: `Your ${tier.name} plan includes ${tier.applications} applications a month. Upgrade to apply for more.` };
  }
  // RLS (can_apply) enforces published, open and verified-only rules.
  const { error } = await m.supabase.from("applications").insert({
    org_id: m.org.id, opportunity_id: p.data.opportunity_id, note: p.data.note ?? null,
    status: "submitted", submitted_by: m.user.id, submitted_at: new Date().toISOString(),
  });
  if (error) {
    if (error.code === "23505") return { error: "You've already applied." };
    return { error: m.org.verification_status === "verified" ? "This opportunity is closed." : "This opportunity is for Dhow Verified companies only." };
  }
  revalidatePath("/app/applications");
  return { ok: "Application sent. We'll keep you posted by email." };
}

export async function withdrawApplication(fd: FormData) {
  const m = await memberOrNull();
  if (!m) return;
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  await m.supabase.from("applications").update({ status: "withdrawn" }).eq("id", id.data).eq("org_id", m.org.id);
  revalidatePath("/app/applications");
}

/** A member deletes their own login. Companies where they are the only owner are deleted with it, documents included. */
export async function deleteMyAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireUser();
  if (s.profile?.staff_role) return { error: "Staff accounts are removed by a Dhow admin. Email hello@dhowpartners.com." };
  if (String(fd.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") return { error: "Type DELETE to confirm." };
  const db = createAdminClient();
  const { data: owned } = await db.from("memberships").select("org_id, organizations(name)").eq("user_id", s.user.id).eq("role", "owner");
  for (const row of owned ?? []) {
    const { count } = await db.from("memberships").select("user_id", { count: "exact", head: true }).eq("org_id", row.org_id).eq("role", "owner").neq("user_id", s.user.id);
    if ((count ?? 0) > 0) continue; // another owner keeps the company
    const { data: docs } = await db.from("documents").select("object_key").eq("org_id", row.org_id);
    await Promise.all((docs ?? []).map((d) => deleteObject(d.object_key).catch(() => null)));
    const { error } = await db.from("organizations").delete().eq("id", row.org_id);
    if (error) return { error: "Could not delete your company. Contact hello@dhowpartners.com." };
    const name = (row.organizations as unknown as { name: string } | null)?.name ?? "A company";
    await notifyStaff(["admin"], "Member company deleted", [`${name} was deleted when its owner deleted their account.`]).catch(() => null);
  }
  const { error } = await db.auth.admin.deleteUser(s.user.id);
  if (error) return { error: "Could not delete your account. Contact hello@dhowpartners.com." };
  await s.supabase.auth.signOut().catch(() => null);
  (await cookies()).delete(ORG_COOKIE);
  redirect("/login?deleted=1");
}

/** The company's owner removes their company page and everything it uploaded. The owner keeps their login. */
export async function deleteMyCompany(_: ActionState, fd: FormData): Promise<ActionState> {
  const m = await memberOrNull();
  if (!m || m.role !== "owner") return { error: "Only the company owner can delete it." };
  if (String(fd.get("confirm") ?? "").trim().toLowerCase() !== m.org.name.trim().toLowerCase()) return { error: `Type ${m.org.name} exactly to confirm.` };
  const db = createAdminClient();
  const { data: docs } = await db.from("documents").select("object_key").eq("org_id", m.org.id);
  await Promise.all((docs ?? []).map((d) => deleteObject(d.object_key).catch(() => null)));
  const { error } = await db.from("organizations").delete().eq("id", m.org.id);
  if (error) return { error: "Could not delete the company. Contact hello@dhowpartners.com." };
  await notifyStaff(["admin"], "Member company deleted", [`${m.org.name} deleted its company page.`]).catch(() => null);
  (await cookies()).delete(ORG_COOKIE);
  redirect("/onboarding");
}

// ----------------------------------------------------------------- interests and email choices
const InterestsIn = z.object({ kinds: z.array(z.enum(["grant", "tender", "program", "event"])).max(4), topics: z.array(z.string().max(40)).max(12) });
/** What the company wants to hear about. Used to rank opportunities and fill the weekly email. */
export async function saveInterests(_: ActionState, fd: FormData): Promise<ActionState> {
  const m = await memberOrNull();
  if (!m || !isOrgAdmin(m.role)) return { error: "Only owners and admins can change this." };
  const p = InterestsIn.safeParse({ kinds: fd.getAll("kinds").map(String), topics: fd.getAll("topics").map(String) });
  if (!p.success) return { error: "Check your choices and try again." };
  const sector = String(fd.get("sector") ?? "").trim().slice(0, 60) || null;
  await createAdminClient().from("organizations").update({ interest_kinds: p.data.kinds, interest_sectors: p.data.topics, ...(fd.has("sector") ? { sector } : {}) }).eq("id", m.org.id);
  revalidatePath("/app", "layout");
  return { ok: "Saved. Opportunities that fit now show first." };
}

/** Which emails this person gets. Account and security emails always go out. */
export async function saveEmailChoices(_: ActionState, fd: FormData): Promise<ActionState> {
  const m = await memberOrNull();
  if (!m) return { error: "Sign in first." };
  const prefs = { opportunities: fd.get("opportunities") === "on", deadlines: fd.get("deadlines") === "on", updates: fd.get("updates") === "on" };
  await createAdminClient().from("profiles").update({ email_prefs: prefs }).eq("id", m.user.id);
  revalidatePath("/app/settings/account");
  return { ok: "Email choices saved." };
}

/** Opt in or out of the member directory, and whether to show business email and phone there. */
export async function saveListing(_: ActionState, fd: FormData): Promise<ActionState> {
  const m = await memberOrNull();
  if (!m || !isOrgAdmin(m.role)) return { error: "Only owners and admins can change this." };
  const listed = fd.get("listed") === "on";
  await createAdminClient().from("organizations").update({ listed, listed_contact: listed && fd.get("listed_contact") === "on" }).eq("id", m.org.id);
  revalidatePath("/app", "layout");
  return { ok: listed ? (m.org.verification_status === "verified" ? "You're listed in the member directory." : "Saved. You'll appear in the directory once you're verified.") : "You're not listed in the directory." };
}
