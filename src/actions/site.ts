"use server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { notifyStaff } from "@/lib/notify";
import type { ActionState } from "@/components/forms";
import { CONTACT_TOPICS } from "@/components/site/nav";


const ContactIn = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  phone: z.string().trim().max(40).optional().transform((v) => v || null),
  company: z.string().trim().max(160).optional().transform((v) => v || null),
  service: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(3000),
  website: z.string().max(0).optional(), // honeypot: real people leave it empty
});

/** Public contact form. Each enquiry becomes a lead in the staff workspace, and staff get an email. */
export async function sendEnquiry(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit("contact", 5, 600))) return { error: "Too many messages. Please try again in a few minutes." };
  const p = ContactIn.safeParse(Object.fromEntries(fd));
  if (!p.success) {
    if (p.error.issues.some((i) => i.path[0] === "website")) return { ok: "Thanks, we'll be in touch." };
    return { error: p.error.issues[0]?.message ?? "Please check the form." };
  }
  const d = p.data;
  const { error } = await createAdminClient().from("leads").insert({
    name: `${d.service}: ${d.name}`.slice(0, 200),
    company: d.company,
    email: d.email,
    phone: d.phone,
    source: "Website",
    status: "new",
    next_step: `Reply to website enquiry: ${d.message}`.slice(0, 300),
  });
  if (error) return { error: "We couldn't send your message just now. Please email hello@dhowpartners.com." };

  await notifyStaff(["admin", "reviewer"], `New enquiry: ${d.service}`, [
    `${d.name}${d.company ? ` (${d.company})` : ""} sent an enquiry from the website.`,
    `Email: ${d.email}${d.phone ? ` · Phone: ${d.phone}` : ""}`,
    d.message,
  ], { label: "Open leads", href: `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads` }).catch(() => undefined);

  return { ok: "Thank you. Your message is with our team, and we'll reply by email." };
}
