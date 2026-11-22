"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { staffOrNull } from "@/lib/auth";
import { sendDecision, sendNextSteps } from "@/lib/membership-intake";

const SEL = "id, name, email, plan, status, decision_sent_at, next_steps_sent_at";

export async function setApplicationReview(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const p = z.object({ id: z.string().uuid(), status: z.enum(["new", "accepted", "waitlisted", "declined", "joined"]), staff_note: z.string().trim().max(2000).optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  await s.supabase.from("membership_applications").update({ status: p.data.status, staff_note: p.data.staff_note || null }).eq("id", p.data.id);
  revalidatePath("/admin/applications");
}

/** Send the outcome email (or next steps) now instead of waiting for the deadline. */
export async function sendApplicationEmailNow(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const p = z.object({ id: z.string().uuid(), which: z.enum(["decision", "next_steps"]) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  const { data: a } = await s.supabase.from("membership_applications").select(SEL).eq("id", p.data.id).single();
  if (!a) return;
  if (p.data.which === "decision") await sendDecision(a);
  else await sendNextSteps(a);
  revalidatePath("/admin/applications");
}
