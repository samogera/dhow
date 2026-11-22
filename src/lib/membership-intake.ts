import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { applicationDecision, applicationNextSteps } from "@/lib/member-emails";

/** Applications close on this date (Nairobi). Decisions go out from then; next steps 3 days after a "congratulations". */
export const applicationsClose = () => process.env.MEMBERSHIP_DEADLINE ?? "2027-01-13";

type App = { id: string; name: string; email: string; plan: string | null; status: string; decision_sent_at: string | null; next_steps_sent_at: string | null };

export async function sendDecision(a: App) {
  if (!["accepted", "waitlisted", "declined"].includes(a.status)) return false;
  await applicationDecision(a.email, a.name, a.status as "accepted" | "waitlisted" | "declined", a.plan);
  await createAdminClient().from("membership_applications").update({ decision_sent_at: new Date().toISOString() }).eq("id", a.id);
  return true;
}

export async function sendNextSteps(a: App) {
  if (a.status !== "accepted") return false;
  await applicationNextSteps(a.email, a.name, a.plan);
  await createAdminClient().from("membership_applications").update({ next_steps_sent_at: new Date().toISOString() }).eq("id", a.id);
  return true;
}

/** Daily: after the deadline, tell everyone decided their outcome; 3 days after "congratulations", send next steps. */
export async function membershipApplicationEmails() {
  const today = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10); // Nairobi date
  if (today < applicationsClose()) return 0;
  const db = createAdminClient();
  let sent = 0;
  const { data: decided } = await db.from("membership_applications").select("id, name, email, plan, status, decision_sent_at, next_steps_sent_at")
    .in("status", ["accepted", "waitlisted", "declined"]).is("decision_sent_at", null).limit(80);
  for (const a of (decided ?? []) as App[]) if (await sendDecision(a).catch(() => false)) sent++;
  const threeDays = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data: ready } = await db.from("membership_applications").select("id, name, email, plan, status, decision_sent_at, next_steps_sent_at")
    .eq("status", "accepted").not("decision_sent_at", "is", null).lte("decision_sent_at", threeDays).is("next_steps_sent_at", null).limit(80);
  for (const a of (ready ?? []) as App[]) if (await sendNextSteps(a).catch(() => false)) sent++;
  return sent;
}
