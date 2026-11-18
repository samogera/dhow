import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml } from "@/lib/format";

// Email through Resend, SMS through Africa's Talking. Every send is logged.
// Missing keys never break the flow: the message is logged as "skipped".

type Log = { orgId?: string | null; template: string };

async function log(row: { org_id?: string | null; channel: "email" | "sms"; template: string; to_address: string; status: string; provider_id?: string | null; error?: string | null }) {
  await createAdminClient().from("notifications").insert(row);
}

export async function sendEmail(opts: Log & {
  to: string; subject: string; html: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return log({ org_id: opts.orgId, channel: "email", template: opts.template, to_address: opts.to, status: "skipped", error: "RESEND_API_KEY not set" });
  try {
    const { data, error } = await new Resend(key).emails.send({
      from: process.env.EMAIL_FROM ?? "Dhow Partners <hello@dhowpartners.com>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments,
    });
    await log({ org_id: opts.orgId, channel: "email", template: opts.template, to_address: opts.to, status: error ? "failed" : "sent", provider_id: data?.id, error: error?.message });
  } catch (e) {
    await log({ org_id: opts.orgId, channel: "email", template: opts.template, to_address: opts.to, status: "failed", error: (e as Error).message });
  }
}

export async function sendSms(opts: Log & { to: string; message: string }) {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  if (!username || !apiKey) return log({ org_id: opts.orgId, channel: "sms", template: opts.template, to_address: opts.to, status: "skipped", error: "Africa's Talking not configured" });
  const host = username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
  const body = new URLSearchParams({ username, to: opts.to.startsWith("+") ? opts.to : `+${opts.to}`, message: opts.message.slice(0, 459) });
  if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);
  try {
    const r = await fetch(`${host}/version1/messaging`, {
      method: "POST",
      headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const j = (await r.json().catch(() => ({}))) as { SMSMessageData?: { Recipients?: { messageId?: string; status?: string }[] } };
    const rec = j.SMSMessageData?.Recipients?.[0];
    await log({ org_id: opts.orgId, channel: "sms", template: opts.template, to_address: opts.to, status: r.ok && rec?.status === "Success" ? "sent" : "failed", provider_id: rec?.messageId, error: r.ok ? rec?.status : `HTTP ${r.status}` });
  } catch (e) {
    await log({ org_id: opts.orgId, channel: "sms", template: opts.template, to_address: opts.to, status: "failed", error: (e as Error).message });
  }
}

/** Branded, minimal HTML email. All dynamic text is escaped. */
export function emailLayout(title: string, paragraphs: string[], cta?: { label: string; href: string }) {
  const p = paragraphs.map((t) => `<p style="margin:0 0 14px;color:#3b4855;font-size:15px;line-height:1.55">${escapeHtml(t)}</p>`).join("");
  const button = cta
    ? `<a href="${escapeHtml(cta.href)}" style="display:inline-block;margin-top:8px;background:#00395f;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600">${escapeHtml(cta.label)}</a>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f3f5f7;font-family:Inter,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;padding:36px">
  <tr><td style="padding-bottom:24px"><img src="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL ?? "")}/brand/wordmark-navy.png" alt="Dhow Partners" height="22" style="height:22px;width:auto;display:block;border:0"></td></tr>
  <tr><td><h1 style="margin:0 0 16px;font-size:22px;color:#0d1c29">${escapeHtml(title)}</h1>${p}${button}</td></tr>
  <tr><td style="padding-top:28px;font-size:12px;color:#98a3ad">Dhow Partners · Nairobi, Kenya · dhowpartners.com</td></tr>
  </table></td></tr></table></body></html>`;
}

/** Notify every owner and admin of an organization by email (and SMS when a phone is set). */
export async function notifyOrg(orgId: string, template: string, subject: string, paragraphs: string[], sms: string, cta?: { label: string; href: string }) {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("memberships")
    .select("user_id")
    .eq("org_id", orgId)
    .in("role", ["owner", "admin"]);
  const ids = (members ?? []).map((m) => m.user_id as string);
  const { data: profiles } = await admin.from("profiles").select("id, phone").in("id", ids);
  for (const id of ids) {
    const { data: u } = await admin.auth.admin.getUserById(id);
    if (u.user?.email) await sendEmail({ orgId, template, to: u.user.email, subject, html: emailLayout(subject, paragraphs, cta) });
    const phone = profiles?.find((p) => p.id === id)?.phone;
    if (phone) await sendSms({ orgId, template, to: phone, message: sms });
  }
}

/** Notify Dhow staff with a given role (reviewers, finance) by email. */
export async function notifyStaff(roles: ("reviewer" | "finance" | "admin")[], subject: string, paragraphs: string[], cta?: { label: string; href: string }) {
  const admin = createAdminClient();
  const { data: staff } = await admin.from("profiles").select("id").in("staff_role", roles);
  for (const s of staff ?? []) {
    const { data: u } = await admin.auth.admin.getUserById(s.id);
    if (u.user?.email) await sendEmail({ template: "staff_alert", to: u.user.email, subject, html: emailLayout(subject, paragraphs, cta) });
  }
}
