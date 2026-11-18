import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBusiness, type KybOutcome } from "@/lib/kyb";
import { notifyOrg, notifyStaff } from "@/lib/notify";
import { deleteObject } from "@/lib/r2";
import { stkQuery } from "@/lib/mpesa";

// Business processes shared by API routes and background jobs.
// Each step is idempotent: running it twice gives the same result.

const app = () => process.env.NEXT_PUBLIC_APP_URL ?? "";

/** After a verification fee is paid: run the KYB lookup, then verify or queue for a reviewer. */
export async function processPaidVerification(paymentId: string) {
  const db = createAdminClient();
  const { data: pay } = await db.from("payments").select("id, org_id, reference_id, status").eq("id", paymentId).single();
  if (!pay || pay.status !== "paid" || !pay.reference_id) return;

  const { data: v } = await db.from("verifications").select("id, status").eq("id", pay.reference_id).single();
  if (!v || !["awaiting_payment", "pending"].includes(v.status)) return; // already handled

  const { data: org } = await db.from("organizations").select("id, name, country, brs_number").eq("id", pay.org_id).single();
  if (!org) return;

  await db.from("verifications").update({ status: "pending" }).eq("id", v.id);

  const outcome: KybOutcome = org.brs_number
    ? await verifyBusiness({ orgId: org.id, companyName: org.name, registrationNumber: org.brs_number, country: org.country })
    : { status: "needs_review", provider: "manual", reason: "No registration number on the profile" };

  if (outcome.status === "verified") {
    await decideVerification(v.id, "verified", null, `Matched by ${outcome.provider}`, outcome.provider, outcome.ref, outcome.details);
    return;
  }

  await db.from("verifications").update({
    status: "in_review",
    provider: outcome.provider,
    provider_ref: outcome.ref ?? null,
    result: { reason: outcome.reason, details: outcome.details ?? null },
  }).eq("id", v.id);
  await db.from("organizations").update({ verification_status: "pending" }).eq("id", org.id);
  await notifyStaff(["reviewer"], `Verification to review: ${org.name}`, [
    `${org.name} paid for instant verification, but it needs a person: ${outcome.reason}.`,
  ], { label: "Open the review", href: `${app()}/admin/reviews/${v.id}` });
  await notifyOrg(org.id, "verification_in_review", "We're reviewing your verification",
    [`Thanks for your payment. A Dhow reviewer is checking ${org.name}'s records and will reply within one working day.`],
    `Dhow Partners: payment received. We're reviewing ${org.name} and will reply within 1 working day.`);
}

/** Final decision on a verification, by a reviewer (reviewerId) or a provider match (null). */
export async function decideVerification(
  verificationId: string,
  decision: "verified" | "rejected",
  reviewerId: string | null,
  note: string,
  provider?: string,
  providerRef?: string,
  details?: Record<string, unknown>,
) {
  const db = createAdminClient();
  const { data: v } = await db.from("verifications").select("id, org_id, status").eq("id", verificationId).single();
  if (!v || ["verified", "rejected"].includes(v.status)) return;

  const now = new Date();
  const until = new Date(now);
  until.setFullYear(until.getFullYear() + 1);

  await db.from("verifications").update({
    status: decision,
    reviewer_id: reviewerId,
    review_note: note,
    decided_at: now.toISOString(),
    ...(provider ? { provider, provider_ref: providerRef ?? null, result: details ?? null } : {}),
  }).eq("id", v.id);

  await db.from("organizations").update(
    decision === "verified"
      ? { verification_status: "verified", verified_at: now.toISOString(), verified_until: until.toISOString() }
      : { verification_status: "rejected" },
  ).eq("id", v.org_id);

  const { data: org } = await db.from("organizations").select("name").eq("id", v.org_id).single();
  if (decision === "verified") {
    await notifyOrg(v.org_id, "verification_verified", "You're Dhow Verified",
      [`${org?.name} is now Dhow Verified until ${until.toDateString()}.`, "Your badge is live and you can apply to verified-only opportunities."],
      `Dhow Partners: ${org?.name} is now Dhow Verified. Your badge is live.`,
      { label: "Open your dashboard", href: `${app()}/app` });
  } else {
    await notifyOrg(v.org_id, "verification_rejected", "We couldn't verify your company yet",
      [`We couldn't confirm ${org?.name}'s records.`, note ? `Reviewer's note: ${note}` : "", "Upload the corrected documents and we'll check again at no cost."].filter(Boolean),
      `Dhow Partners: we couldn't verify ${org?.name} yet. Check your email for what to fix.`,
      { label: "Fix your documents", href: `${app()}/app/verification` });
  }
}

/** Daily housekeeping. */
export async function dailyMaintenance() {
  const db = createAdminClient();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();

  // 1. Uploads that were never completed: delete the object and release the reserved space.
  const { data: stale } = await db.from("documents").select("id, org_id, object_key, size_bytes").eq("status", "pending_upload").lt("created_at", dayAgo);
  for (const d of stale ?? []) {
    await deleteObject(d.object_key).catch(() => undefined);
    await db.rpc("release_storage", { p_org: d.org_id, p_reserved: d.size_bytes, p_used: 0 });
    await db.from("documents").delete().eq("id", d.id);
  }

  // 2. Badges past their date.
  await db.from("organizations").update({ verification_status: "expired" }).eq("verification_status", "verified").lt("verified_until", new Date().toISOString());

  // 3. Invoices past due.
  const today = new Date().toISOString().slice(0, 10);
  await db.from("invoices").update({ status: "overdue" }).in("status", ["sent"]).lt("due_date", today);

  // 4. Payments stuck in pending for over 10 minutes: ask Daraja what happened.
  const tenMin = new Date(Date.now() - 600_000).toISOString();
  const { data: pending } = await db.from("payments").select("id, checkout_request_id").eq("status", "pending").lt("created_at", tenMin).limit(50);
  for (const p of pending ?? []) {
    if (!p.checkout_request_id) continue;
    const q = await stkQuery(p.checkout_request_id).catch(() => null);
    if (q?.resultCode && q.resultCode !== "0") {
      await db.from("payments").update({ status: q.resultCode === "1032" ? "cancelled" : "failed", result_desc: q.resultDesc }).eq("id", p.id).eq("status", "pending");
    }
    // A "0" result means paid: the callback carries the receipt, so we wait for it rather than guess.
  }
}

/** Remind members about opportunity deadlines three days out. */
export async function deadlineReminders() {
  const db = createAdminClient();
  const target = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const { data: apps } = await db
    .from("applications")
    .select("org_id, opportunities!inner(title, deadline)")
    .eq("status", "draft")
    .eq("opportunities.deadline", target);
  for (const a of (apps ?? []) as unknown as { org_id: string; opportunities: { title: string } }[]) {
    await notifyOrg(a.org_id, "deadline_reminder", `3 days left: ${a.opportunities.title}`,
      [`Your application for "${a.opportunities.title}" is still a draft and closes in 3 days.`],
      `Dhow Partners: 3 days left to submit "${a.opportunities.title}".`,
      { label: "Finish your application", href: `${app()}/app/applications` });
  }
}
