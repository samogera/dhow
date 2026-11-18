"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ORG_COOKIE, isOrgAdmin, memberOrNull, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, randomToken, sha256 } from "@/lib/crypto";
import { normalizeKenyanPhone } from "@/lib/mpesa";
import { deleteObject } from "@/lib/r2";
import { emailLayout, notifyStaff, sendEmail } from "@/lib/notify";
import type { ActionState } from "@/components/forms";

const app = () => process.env.NEXT_PUBLIC_APP_URL!;
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
  redirect("/app");
}

export async function updateOrganization(_: ActionState, fd: FormData): Promise<ActionState> {
  const m = await memberOrNull();
  if (!m || !isOrgAdmin(m.role)) return { error: "Only owners and admins can edit the company." };
  const p = OrgInput.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const { kra_pin, brs_number, ...rest } = p.data;

  const patch: Record<string, unknown> = { ...rest };
  // Registration details lock once verified, so a badge can't be moved to another company.
  if (m.org.verification_status !== "verified") {
    patch.brs_number = brs_number;
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

/** Free route: a Dhow reviewer checks the uploaded documents. */
export async function requestManualVerification(_: ActionState): Promise<ActionState> {
  const m = await memberOrNull();
  if (!m || !isOrgAdmin(m.role)) return { error: "Only owners and admins can request verification." };
  if (m.org.verification_status === "verified") return { error: "You're already verified." };
  if (!m.org.brs_number) return { error: "Add your BRS registration number in Settings first." };

  const db = createAdminClient();
  const { data: docs } = await db.from("documents").select("kind").eq("org_id", m.org.id).in("status", ["uploaded", "approved"]);
  const kinds = new Set((docs ?? []).map((d) => d.kind));
  if (!(kinds.has("cr12") || kinds.has("certificate_of_incorporation")) || !kinds.has("kra_pin")) {
    return { error: "Upload your CR12 (or certificate of incorporation) and KRA PIN certificate first." };
  }
  const { data: open } = await db.from("verifications").select("id").eq("org_id", m.org.id).in("status", ["pending", "in_review"]).limit(1);
  if (open?.length) return { error: "Your verification is already in review." };

  await db.from("verifications").insert({ org_id: m.org.id, tier: "manual", status: "in_review", provider: "manual", requested_by: m.user.id });
  await db.from("organizations").update({ verification_status: "pending" }).eq("id", m.org.id);
  await notifyStaff(["reviewer"], `New verification: ${m.org.name}`, [`${m.org.name} asked for free verification. Their documents are ready to review.`], { label: "Open reviews", href: `${app()}/admin/reviews` });
  revalidatePath("/app", "layout");
  return { ok: "Submitted. A reviewer will reply within 3 working days." };
}

export async function applyToOpportunity(_: ActionState, fd: FormData): Promise<ActionState> {
  const m = await memberOrNull();
  if (!m) return { error: "Sign in first." };
  const p = z.object({ opportunity_id: z.string().uuid(), note: z.string().trim().max(2000).optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Something's missing." };
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
