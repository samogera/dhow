"use server";
import { after } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyStaff } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { appUrl } from "@/lib/app-url";

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

  if (p.data.response === "interested") {
    after(() => notifyStaff(["admin"], `${inv.name} is interested in ${org.name}`,
      [`${inv.name} said they're interested in meeting ${org.name}.`, ...(p.data.note ? [`Their note: "${p.data.note}"`] : []), "Make the introduction when you're ready."],
      { label: "Open investors", href: `${appUrl()}/admin/investors` }).catch(() => null));
  }
  return { ok: p.data.response === "interested" ? "Noted. Dhow Partners will set up the introduction." : "Noted. We won't suggest this one again.", response: p.data.response };
}
