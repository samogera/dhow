"use server";
import { after } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyStaff } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { appUrl } from "@/lib/app-url";
import { notifyInvestor } from "@/lib/investor-notify";
import { CONTACT_TOPICS } from "@/lib/investors";

export type InvestorState = { ok?: string; error?: string; response?: "interested" | "not_now" };

const Input = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{24,64}$/),
  org_id: z.string().uuid(),
  response: z.enum(["interested", "not_now"]),
  note: z.string().trim().max(1000).optional().transform((v) => v || null),
});

/** An investor says Interested or Not now about a company, from their private link. */
export async function respondAsInvestor(_: InvestorState, fd: FormData): Promise<InvestorState> {
  const p = Input.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Something's missing. Refresh and try again." };
  if (!(await rateLimit(`investor:${p.data.token.slice(0, 12)}`, 60, 600))) return { error: "Too many answers at once. Try again in a few minutes." };
  const db = createAdminClient();
  const { data: inv } = await db.from("investors").select("id, name").eq("portal_token", p.data.token).eq("active", true).maybeSingle();
  if (!inv) return { error: "This link is no longer active. Ask Dhow Partners for a new one." };
  const { data: org } = await db.from("organizations").select("id, name, verification_status, listed").eq("id", p.data.org_id).maybeSingle();
  if (!org) return { error: "We couldn't find that company." };
  // Only companies that asked for this investor, or verified listed ones, can be answered.
  const { data: asked } = await db.from("member_requests").select("id").eq("kind", "investor_intro").eq("target_id", inv.id).eq("org_id", org.id).limit(1);
  if (!asked?.length && !(org.verification_status === "verified" && org.listed)) return { error: "That company isn't available." };

  const { error } = await db.from("investor_interest").upsert({
    investor_id: inv.id, org_id: org.id, response: p.data.response, note: p.data.note, seen_by_staff: false, updated_at: new Date().toISOString(),
  }, { onConflict: "investor_id,org_id" });
  if (error) return { error: "Couldn't save that. Try again." };
  if (asked?.length) await db.from("member_requests").update({ status: "in_progress", staff_note: `${inv.name}: ${p.data.response === "interested" ? "interested" : "not now"}${p.data.note ? ` (${p.data.note})` : ""}` }).eq("id", asked[0].id);

  after(() => notifyInvestor(inv.id, {
    kind: "response", orgId: org.id, body: p.data.note,
    title: p.data.response === "interested" ? `You're interested in ${org.name}. We'll arrange the introduction.` : `You passed on ${org.name} for now`,
  }).catch(() => null));
  if (p.data.response === "interested") {
    after(() => notifyStaff(["admin"], `${inv.name} is interested in ${org.name}`,
      [`${inv.name} said they're interested in meeting ${org.name}.`, ...(p.data.note ? [`Their note: "${p.data.note}"`] : []), "Make the introduction when you're ready."],
      { label: "Open investors", href: `${appUrl()}/admin/investors` }).catch(() => null));
  }
  return { ok: p.data.response === "interested" ? "Noted. Dhow Partners will set up the introduction." : "Noted. We won't suggest this one again.", response: p.data.response };
}

const list = z.string().optional().transform((v) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 10));
const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const ProfileIn = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{24,64}$/),
  contact_name: opt(120),
  email: z.string().trim().email("That email doesn't look right.").max(200).optional().or(z.literal("")).transform((v) => v || null),
  about: opt(1200),
  ticket: opt(80),
  countries: opt(120),
  website: z.string().trim().max(300).optional().transform((v) => (v ? (v.startsWith("http") ? v : `https://${v}`) : null)),
  sectors: list,
  stages: list,
  instruments: list,
  kind: z.enum(["fund", "angel", "bank", "dfi", "corporate", "grant"]).optional(),
  contact_role: opt(120),
  phone: z.string().trim().max(40).regex(/^[+\d\s()-]*$/, "Use digits only for the phone number.").optional().transform((v) => v || null),
  alert_new_request: z.literal("on").optional().transform((v) => v === "on"),
  alert_intro_update: z.literal("on").optional().transform((v) => v === "on"),
  alert_new_companies: z.literal("on").optional().transform((v) => v === "on"),
});

/** The investor updates their own profile from their private page. */
export async function saveInvestorProfile(_: InvestorState, fd: FormData): Promise<InvestorState> {
  const values = Object.fromEntries(fd);
  const p = ProfileIn.safeParse(values);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form and try again." };
  if (!(await rateLimit(`investor-profile:${p.data.token.slice(0, 12)}`, 20, 600))) return { error: "Too many saves. Try again in a few minutes." };
  const db = createAdminClient();
  const { data: inv } = await db.from("investors").select("id, name").eq("portal_token", p.data.token).maybeSingle();
  if (!inv) return { error: "This link is no longer active." };
  const { token, phone, alert_new_request, alert_intro_update, alert_new_companies, ...row } = p.data;
  void token;
  let logo_url: string | undefined;
  const logo = fd.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const { uploadImage } = await import("@/lib/storage");
    const up = await uploadImage(logo, "investors");
    if ("error" in up) return { error: up.error };
    logo_url = up.url;
  }
  const { error } = await db.from("investors").update({ ...row, ...(logo_url ? { logo_url } : {}), updated_by_investor_at: new Date().toISOString() }).eq("id", inv.id);
  if (error) return { error: "Couldn't save. Try again." };
  const { error: setErr } = await db.from("investor_settings").upsert({ investor_id: inv.id, phone, alert_new_request, alert_intro_update, alert_new_companies, updated_at: new Date().toISOString() });
  if (setErr) return { error: "Saved your profile, but not your alert settings. Try again." };
  after(() => notifyInvestor(inv.id, { kind: "profile", title: "You updated your profile", body: p.data.email ? `Email alerts go to ${p.data.email}.` : "Add an email to get alerts by email." }).catch(() => null));
  after(() => notifyStaff(["admin"], `${inv.name} updated their investor profile`, [`${inv.name} changed their details on their private page.`], { label: "Open investors", href: `${appUrl()}/admin/investors` }).catch(() => null));
  return { ok: "Saved. Thank you." };
}

/** The investor asks Dhow to delete their profile. The team confirms and deletes it in admin. */
export async function requestInvestorDeletion(_: InvestorState, fd: FormData): Promise<InvestorState> {
  const token = z.string().regex(/^[A-Za-z0-9_-]{24,64}$/).safeParse(fd.get("token"));
  if (!token.success) return { error: "This link is no longer active." };
  const db = createAdminClient();
  const { data: inv } = await db.from("investors").select("id, name, deletion_requested_at").eq("portal_token", token.data).maybeSingle();
  if (!inv) return { error: "This link is no longer active." };
  if (!inv.deletion_requested_at) {
    await db.from("investors").update({ deletion_requested_at: new Date().toISOString(), active: false }).eq("id", inv.id);
    after(() => notifyStaff(["admin"], `${inv.name} asked to delete their investor profile`, [`${inv.name} asked Dhow Partners to delete their profile. They're hidden from members now.`, "Delete them in Investors within 30 days."],
      { label: "Open investors", href: `${appUrl()}/admin/investors` }).catch(() => null));
  }
  return { ok: "Request received. Your profile is hidden now, and we'll delete it within 30 days." };
}

export type InvestorNotice = { id: string; kind: string; title: string; body: string | null; emailed: boolean; read_at: string | null; created_at: string };
const Token = z.string().regex(/^[A-Za-z0-9_-]{24,64}$/);

async function investorFor(token: unknown) {
  const t = Token.safeParse(token);
  if (!t.success) return null;
  const { data } = await createAdminClient().from("investors").select("id").eq("portal_token", t.data).eq("active", true).maybeSingle();
  return data;
}

/** The investor's notifications, newest first. The page asks for these every few seconds while it's open. */
export async function getInvestorFeed(token: string): Promise<InvestorNotice[] | null> {
  const inv = await investorFor(token);
  if (!inv) return null;
  const { data } = await createAdminClient().from("investor_notifications").select("id, kind, title, body, emailed, read_at, created_at")
    .eq("investor_id", inv.id).order("created_at", { ascending: false }).limit(50);
  return (data ?? []) as InvestorNotice[];
}

export async function markInvestorFeedRead(token: string) {
  const inv = await investorFor(token);
  if (!inv) return;
  await createAdminClient().from("investor_notifications").update({ read_at: new Date().toISOString() }).eq("investor_id", inv.id).is("read_at", null);
}


const ContactIn = z.object({
  token: Token,
  topic: z.enum(Object.keys(CONTACT_TOPICS) as [keyof typeof CONTACT_TOPICS, ...(keyof typeof CONTACT_TOPICS)[]]),
  organisation: z.string().trim().min(2, "Add your organisation's name.").max(160),
  name: z.string().trim().min(2, "Add your name.").max(120),
  role: opt(120),
  email: z.string().trim().email("Add an email we can reply to.").max(200),
  phone: z.string().trim().max(40).regex(/^[+\d\s()-]*$/, "Use digits only for the phone number.").optional().transform((v) => v || null),
  reply_by: z.enum(["email", "phone", "whatsapp"]).default("email"),
  message: z.string().trim().min(5, "Tell us a little more.").max(3000),
});

/** An investor writes to the team from their private page. It lands in the Dhow inbox with their details attached. */
export async function sendInvestorMessage(_: InvestorState, fd: FormData): Promise<InvestorState> {
  const values = Object.fromEntries(fd);
  const p = ContactIn.safeParse(values);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form and try again." };
  if (!(await rateLimit(`investor-contact:${p.data.token.slice(0, 12)}`, 8, 3600))) return { error: "You've sent a few messages already. Try again in an hour, or email hello@dhowpartners.com." };
  const db = createAdminClient();
  const { data: inv } = await db.from("investors").select("id, name").eq("portal_token", p.data.token).eq("active", true).maybeSingle();
  if (!inv) return { error: "This link is no longer active. Email hello@dhowpartners.com." };
  const d = p.data;
  const topic = CONTACT_TOPICS[d.topic];
  const reply = d.reply_by === "email" ? `email (${d.email})` : `${d.reply_by === "phone" ? "phone" : "WhatsApp"} (${d.phone ?? "no number given"})`;
  const { emailLayout, sendEmail } = await import("@/lib/notify");
  await sendEmail({
    template: "investor_contact", to: process.env.HELP_INBOX ?? "hello@dhowpartners.com", replyTo: d.email,
    subject: `Investor message · ${inv.name}: ${topic}`,
    html: emailLayout(`${inv.name}: ${topic}`, [
      `From ${d.name}${d.role ? `, ${d.role}` : ""} at ${d.organisation}.`,
      `Topic: ${topic}`,
      `Message: ${d.message}`,
      `Email: ${d.email}${d.phone ? ` · Phone: ${d.phone}` : ""}`,
      `They'd like a reply by ${reply}.`,
    ], { label: "Open investors", href: `${appUrl()}/admin/investors` }),
  });
  after(() => notifyInvestor(inv.id, { kind: "message", title: `You wrote to us: ${topic}`, body: d.message }).catch(() => null));
  after(() => notifyStaff(["admin"], `${inv.name} sent a message: ${topic}`, [`${d.name} at ${d.organisation} wrote from their investor page.`, `"${d.message}"`, `Reply by ${reply}.`],
    { label: "Open investors", href: `${appUrl()}/admin/investors` }).catch(() => null));
  return { ok: "sent" };
}
