"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { memberOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailLayout, sendEmail } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { appUrl } from "@/lib/app-url";
import { atLeast, type Tier } from "@/lib/plans";

export type RequestState = { ok?: string; error?: string };

const KINDS = {
  member_intro: { need: "free" as Tier, title: "Introduction to a member", done: "Requested. We'll check with them and introduce you." },
  investor_intro: { need: "premium" as Tier, title: "Introduction to an investor", done: "Requested. We'll review your fit and make the introduction." },
  event_representation: { need: "basic" as Tier, title: "Representation at an event", done: "Requested. We'll confirm the details and cost with you." },
};

const Input = z.object({
  kind: z.enum(["member_intro", "investor_intro", "event_representation"]),
  target_id: z.string().uuid(),
  note: z.string().trim().max(1000).optional().transform((v) => v || null),
});

/** A member asks Dhow to introduce them to a member or investor, or to represent them at an event. */
export async function makeRequest(_: RequestState, fd: FormData): Promise<RequestState> {
  const m = await memberOrNull();
  if (!m) return { error: "Sign in first." };
  const p = Input.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Something's missing. Refresh and try again." };
  const k = KINDS[p.data.kind];
  if (!atLeast(m.org, k.need)) return { error: `This needs the ${k.need === "premium" ? "Growth" : "Startup"} plan or higher.` };
  if (!(await rateLimit("requests", 10, 600))) return { error: "Too many requests. Try again in a few minutes." };

  const db = createAdminClient();
  const table = p.data.kind === "member_intro" ? "organizations" : p.data.kind === "investor_intro" ? "investors" : "opportunities";
  const { data: target } = await db.from(table).select(p.data.kind === "event_representation" ? "title" : "name").eq("id", p.data.target_id).maybeSingle();
  if (!target) return { error: "We couldn't find that one." };
  const targetName = (target as { name?: string; title?: string }).name ?? (target as { title?: string }).title ?? "";
  if (p.data.kind === "member_intro" && p.data.target_id === m.org.id) return { error: "That's your own company." };

  const { error } = await db.from("member_requests").insert({
    org_id: m.org.id, user_id: m.user.id, kind: p.data.kind, target_id: p.data.target_id, target_name: targetName, note: p.data.note,
  });
  if (error) return { error: error.code === "23505" ? "You've already asked. We're on it." : "Couldn't send that. Try again." };

  const who = m.profile?.full_name || m.user.email || "A member";
  after(() => sendEmail({
    template: "member_request",
    to: process.env.HELP_INBOX ?? "hello@dhowpartners.com",
    replyTo: m.user.email ?? undefined,
    subject: `${k.title}: ${m.org.name} → ${targetName}`,
    html: emailLayout(`${k.title}`, [
      `${who} at ${m.org.name} asked for: ${k.title.toLowerCase()}.`,
      `For: ${targetName}`,
      ...(p.data.note ? [`Note: ${p.data.note}`] : []),
      `Reach them at ${m.user.email ?? "-"}${m.profile?.phone ? ` or ${m.profile.phone}` : ""}.`,
    ], { label: "Open requests", href: `${appUrl()}/admin/requests` }),
  }));
  revalidatePath("/app/investors");
  return { ok: k.done };
}
