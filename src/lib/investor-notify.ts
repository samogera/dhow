import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailLayout, sendEmail } from "@/lib/notify";
import { appUrl } from "@/lib/app-url";

export type InvestorNoticeKind = "request" | "intro" | "response" | "profile" | "news" | "message";
export type InvestorAlert = "alert_new_request" | "alert_intro_update" | "alert_new_companies";

/** Makes sure the investor has a private page link, and returns it. */
export async function investorToken(investorId: string, existing?: string | null) {
  if (existing) return existing;
  const { randomBytes } = await import("node:crypto");
  const token = randomBytes(24).toString("base64url");
  await createAdminClient().from("investors").update({ portal_token: token }).eq("id", investorId);
  return token;
}

/**
 * Records a notification on the investor's private page (it appears there within seconds),
 * and emails them straight away if they have an email and that alert switched on.
 */
export async function notifyInvestor(investorId: string, n: {
  kind: InvestorNoticeKind; title: string; body?: string | null; orgId?: string | null;
  email?: { alert: InvestorAlert; subject: string; paragraphs: string[]; cta: string };
}) {
  const db = createAdminClient();
  const [{ data: inv }, { data: set }] = await Promise.all([
    db.from("investors").select("id, name, email, contact_name, portal_token, active").eq("id", investorId).maybeSingle(),
    db.from("investor_settings").select("alert_new_request, alert_intro_update, alert_new_companies").eq("investor_id", investorId).maybeSingle(),
  ]);
  if (!inv) return;
  const wantsEmail = Boolean(n.email && inv.email && inv.active && (set ? (set as Record<InvestorAlert, boolean>)[n.email.alert] !== false : true));
  await db.from("investor_notifications").insert({
    investor_id: inv.id, kind: n.kind, title: n.title.slice(0, 200), body: n.body?.slice(0, 1000) ?? null, org_id: n.orgId ?? null, emailed: wantsEmail,
  });
  if (!wantsEmail || !n.email) return;
  const token = await investorToken(inv.id, inv.portal_token as string | null);
  const first = ((inv.contact_name as string | null) ?? "").split(" ")[0] || "there";
  await sendEmail({
    template: `investor_${n.kind}`, to: inv.email as string, replyTo: process.env.HELP_INBOX ?? "hello@dhowpartners.com",
    subject: n.email.subject,
    html: emailLayout(`Hello ${first}`, n.email.paragraphs, { label: n.email.cta, href: `${appUrl()}/investor/${token}` }),
  });
}
