"use server";
import { after } from "next/server";
import { z } from "zod";
import { memberOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailLayout, sendEmail } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { appUrl } from "@/lib/app-url";

export type HelpState = { ok?: boolean; error?: string };

const Input = z.object({
  topic: z.string().trim().min(1, "Pick what you need help with.").max(80),
  name: z.string().trim().min(2, "Add your name.").max(120),
  email: z.string().trim().max(200).optional().transform((v) => v || null),
  phone: z.string().trim().max(40).optional().transform((v) => v || null),
  note: z.string().trim().max(1000).optional().transform((v) => v || null),
  token: z.string().trim().max(64).optional().transform((v) => v || null),
});

/** "Need a hand?" from the member home or a client's portal: emails the Dhow inbox and adds a lead. */
export async function askForHelp(_: HelpState, fd: FormData): Promise<HelpState> {
  if (!(await rateLimit("help", 5, 600))) return { error: "Too many requests. Try again in a few minutes." };
  const p = Input.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form and try again." };
  const v = p.data;
  if (v.email && !z.string().email().safeParse(v.email).success) return { error: "That email doesn't look right." };
  if (!v.email && !v.phone) return { error: "Add an email or phone number so we can reach you." };

  const db = createAdminClient();
  let company: string | null = null;
  let from = "";
  let clientId: string | null = null;
  if (v.token) {
    if (!/^[A-Za-z0-9_-]{24,64}$/.test(v.token)) return { error: "This link is no longer valid." };
    const { data: c } = await db.from("clients").select("id, name").eq("portal_token", v.token).maybeSingle();
    if (!c) return { error: "This link is no longer valid." };
    company = c.name;
    clientId = c.id;
    from = "Client portal";
  } else {
    const m = await memberOrNull();
    if (!m) return { error: "Sign in first." };
    company = m.org.name;
    from = "Member workspace";
  }

  await db.from("leads").insert({
    name: v.name, company, email: v.email, phone: v.phone, source: from,
    next_step: `${v.topic}${v.note ? `: ${v.note.slice(0, 300)}` : ""}`, client_id: clientId,
  });

  const inbox = process.env.HELP_INBOX ?? "hello@dhowpartners.com";
  after(() => sendEmail({
    template: "help_request",
    to: inbox,
    replyTo: v.email ?? undefined,
    subject: `Help request: ${v.topic} (${company ?? v.name})`,
    html: emailLayout(`${v.name} needs a hand`, [
      `What: ${v.topic}`,
      `Company: ${company ?? "-"} (${from})`,
      `Email: ${v.email ?? "-"}`,
      `Phone: ${v.phone ?? "-"}`,
      ...(v.note ? [`Note: ${v.note}`] : []),
      "It's also in Leads. Reply to this email to answer them directly.",
    ], { label: "Open leads", href: `${appUrl()}/admin/leads` }),
  }));
  return { ok: true };
}
