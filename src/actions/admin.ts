"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { friendlyError } from "@/lib/form-errors";
import { staffOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideVerification } from "@/lib/workflows";
import { verifyBusiness } from "@/lib/kyb";
import { loadInvoice } from "@/lib/invoices";
import { paystackConfigured } from "@/lib/paystack";
import { invoicePayUrl } from "@/lib/payments";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { loadIssuer } from "@/lib/dhow-profile";
import { emailLayout, notifyOrg, sendEmail } from "@/lib/notify";
import { kes } from "@/lib/format";
import type { ActionState } from "@/components/forms";
import { appUrl } from "@/lib/app-url";

// Every action checks the caller's staff role first. Most writes then go through
// the caller's own client, so row-level security checks them a second time.

const DENIED: ActionState = { error: "You don't have access to do that." };
const text = (max = 500) => z.string().trim().max(max).optional().transform((v) => v || null);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null);
const money = z.preprocess((v) => (v === "" || v === undefined || v === null ? null : Number(v)), z.number().min(0).max(1e12).nullable());
const uuid = z.string().uuid();
const optUuid = z.string().uuid().optional().or(z.literal("")).transform((v) => v || null);
const first = (e: z.ZodError, values?: Record<string, unknown>) => friendlyError(e, values);
const form = (fd: FormData) => Object.fromEntries(fd);

// ----------------------------------------------------------------- verification
export async function reviewVerification(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull(["reviewer"]);
  if (!s) return DENIED;
  const p = z.object({ id: uuid, decision: z.enum(["verified", "rejected"]), note: z.string().trim().max(1000) }).safeParse(form(fd));
  if (!p.success) return first(p.error);
  if (p.data.decision === "rejected" && !p.data.note) return { error: "Tell the member what to fix." };

  const db = createAdminClient();
  const { data: v } = await db.from("verifications").select("org_id").eq("id", p.data.id).single();
  await decideVerification(p.data.id, p.data.decision, s.user.id, p.data.note);
  if (v && p.data.decision === "verified") {
    await db.from("documents").update({ status: "approved" }).eq("org_id", v.org_id).eq("status", "uploaded");
  }
  revalidatePath("/admin/reviews");
  redirect("/admin/reviews");
}

/** Runs the automatic registry check again for a request in review (e.g. after switching the provider on). */
export async function rerunAutomaticCheck(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull(["reviewer"]);
  if (!s) return DENIED;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { error: "Bad request." };
  const db = createAdminClient();
  const { data: v } = await db.from("verifications").select("id, status, org_id").eq("id", id.data).single();
  if (!v || !["pending", "in_review"].includes(v.status)) return { error: "This request is already decided." };
  const { data: org } = await db.from("organizations").select("id, name, country, brs_number, postal_address, postal_code").eq("id", v.org_id).single();
  if (!org?.brs_number) return { error: "The company has no registration number on its profile." };

  const outcome = await verifyBusiness({ orgId: org.id, companyName: org.name, registrationNumber: org.brs_number, country: org.country, postalAddress: org.postal_address, postalCode: org.postal_code });
  if (outcome.status === "verified") {
    await decideVerification(v.id, "verified", s.user.id, `Matched by ${outcome.provider}`, outcome.provider, outcome.ref, outcome.details);
    revalidatePath(`/admin/reviews/${v.id}`);
    revalidatePath("/admin/reviews");
    return { ok: `Verified automatically by ${outcome.provider}. The company has been notified.` };
  }
  await db.from("verifications").update({
    status: "in_review", provider: outcome.provider, provider_ref: outcome.ref ?? null,
    result: { reason: outcome.reason, details: outcome.details ?? null },
  }).eq("id", v.id);
  revalidatePath(`/admin/reviews/${v.id}`);
  return { error: `Not verified automatically: ${outcome.reason}` };
}

export async function reviewDocument(fd: FormData) {
  const s = await staffOrNull(["reviewer"]);
  if (!s) return;
  const p = z.object({ id: uuid, status: z.enum(["approved", "rejected"]), note: text(300), back: z.string().startsWith("/admin") }).safeParse(form(fd));
  if (!p.success) return;
  await createAdminClient().from("documents").update({ status: p.data.status, review_note: p.data.note }).eq("id", p.data.id);
  revalidatePath(p.data.back);
}

export async function setOrgPlan(fd: FormData) {
  const s = await staffOrNull(["admin"]);
  if (!s) return;
  const p = z.object({ org_id: uuid, plan: z.enum(["free", "starter", "growth", "market_entry"]) }).safeParse(form(fd));
  if (!p.success) return;
  await createAdminClient().from("organizations").update({ plan: p.data.plan }).eq("id", p.data.org_id);
  revalidatePath("/admin/members");
}

// ----------------------------------------------------------------- CRM
const ClientIn = z.object({
  id: optUuid,
  name: z.string().trim().min(2, "Enter a name").max(160),
  sector: text(80), client_type: text(80), email: text(160), phone: text(40), website: text(200), country: text(60), notes: text(4000),
  stage: z.enum(["onboarding", "active", "on_hold", "completed", "lost"]),
});
export async function saveClient(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const values = form(fd);
  const p = ClientIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  const { id, ...row } = p.data;
  if (id) {
    const { error } = await s.supabase.from("clients").update(row).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${id}`);
    return { ok: "Client saved." };
  }
  const { data, error } = await s.supabase.from("clients").insert({ ...row, account_lead: s.user.id }).select("id").single();
  if (error || !data) return { error: error?.message ?? "Could not add the client." };
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${data.id}`);
}

const LeadIn = z.object({
  id: optUuid,
  name: z.string().trim().min(2, "Describe the lead").max(200),
  company: text(160), email: text(160), phone: text(40), source: text(60), next_step: text(300),
  next_step_date: date, est_value_kes: money,
  status: z.enum(["new", "contacted", "call_booked", "plan_sent", "won", "lost"]),
  notes: text(4000), last_contact: date,
});
export async function saveLead(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const values = form(fd);
  const p = LeadIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  const { id, ...row } = p.data;
  const { error } = id ? await s.supabase.from("leads").update(row).eq("id", id) : await s.supabase.from("leads").insert({ ...row, owner: s.user.id });
  if (error) return { error: error.message };
  revalidatePath("/admin/leads");
  return { ok: "Lead saved." };
}

export async function setLeadStatus(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const p = z.object({ id: uuid, status: z.enum(["new", "contacted", "call_booked", "plan_sent", "won", "lost"]) }).safeParse(form(fd));
  if (!p.success) return;
  await s.supabase.from("leads").update({ status: p.data.status }).eq("id", p.data.id);
  revalidatePath("/admin/leads");
}

/** A won lead becomes a client in one click. */
export async function convertLead(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const { data: lead } = await s.supabase.from("leads").select("*").eq("id", id.data).single();
  if (!lead || lead.client_id) return;
  const { data: client } = await s.supabase.from("clients")
    .insert({ name: lead.company || lead.name, email: lead.email, phone: lead.phone, stage: "onboarding", account_lead: s.user.id, notes: lead.next_step })
    .select("id").single();
  if (client) await s.supabase.from("leads").update({ status: "won", client_id: client.id }).eq("id", lead.id);
  revalidatePath("/admin/leads");
  revalidatePath("/admin/clients");
}

const PartnerIn = z.object({
  id: optUuid,
  name: z.string().trim().min(2).max(160),
  discipline: text(80), commission_terms: text(500), website: text(200), email: text(160), phone: text(40), notes: text(2000),
  relationship: z.enum(["service", "referral", "institution"]),
  status: z.enum(["vetting", "approved", "paused", "rejected"]),
});
export async function savePartner(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const values = form(fd);
  const p = PartnerIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  const { id, ...row } = p.data;
  const { error } = id ? await s.supabase.from("partners").update(row).eq("id", id) : await s.supabase.from("partners").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/admin/partners");
  return { ok: "Partner saved." };
}

const ContactIn = z.object({ name: z.string().trim().min(2).max(120), role: text(120), email: text(160), phone: text(40), client_id: optUuid, partner_id: optUuid });
export async function saveContact(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const values = form(fd);
  const p = ContactIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  const { error } = await s.supabase.from("contacts").insert(p.data);
  if (error) return { error: error.message };
  revalidatePath("/admin/clients", "layout");
  revalidatePath("/admin/partners", "layout");
  return { ok: "Contact added." };
}

// ----------------------------------------------------------------- projects and tasks
const ProjectIn = z.object({
  id: optUuid,
  name: z.string().trim().min(2).max(200),
  client_id: optUuid, description: text(4000), start_date: date, due_date: date, fee_kes: money,
  status: z.enum(["todo", "in_progress", "review", "done"]),
  priority: z.enum(["low", "medium", "high"]),
});
export async function saveProject(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const values = form(fd);
  const p = ProjectIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  const { id, ...row } = p.data;
  if (id) {
    const { error } = await s.supabase.from("projects").update(row).eq("id", id);
    if (error) return { error: error.message };
    revalidateWork(id);
    return { ok: "Project saved." };
  }
  const { data, error } = await s.supabase.from("projects").insert({ ...row, owner: s.user.id }).select("id").single();
  if (error || !data) return { error: error?.message ?? "Could not create the project." };
  revalidateWork();
  redirect(`/admin/projects/${data.id}`);
}

export async function setProjectStatus(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const p = z.object({ id: uuid, status: z.enum(["todo", "in_progress", "review", "done"]) }).safeParse(form(fd));
  if (!p.success) return;
  await s.supabase.from("projects").update({ status: p.data.status }).eq("id", p.data.id);
  revalidateWork(p.data.id);
}

const TaskIn = z.object({
  title: z.string().trim().min(2, "Write the task").max(300), project_id: optUuid, due_date: date,
  priority: z.enum(["low", "medium", "high"]).default("medium"), assignee: optUuid, reviewer: optUuid, notes: text(2000),
});
function revalidateWork(projectId?: string | null) {
  revalidatePath("/admin/projects");
  if (projectId) revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin");
}
export async function addTask(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const values = form(fd);
  const p = TaskIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  const { error } = await s.supabase.from("tasks").insert({ ...p.data, assignee: p.data.assignee ?? s.user.id });
  if (error) return { error: error.message };
  revalidateWork(p.data.project_id);
  return { ok: "Task added." };
}

export async function toggleTask(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const p = z.object({ id: uuid, done: z.enum(["1", "0"]) }).safeParse(form(fd));
  if (!p.success) return;
  if (p.data.done === "1" && s.staffRole === "employee") {
    // An employee's finished work is checked by someone else before it counts as done.
    const { data } = await s.supabase.from("tasks").update({ status: "review", review_state: "requested" }).eq("id", p.data.id).select("project_id").single();
    revalidateWork(data?.project_id);
    return;
  }
  const { data } = await s.supabase.from("tasks").update(p.data.done === "1" ? { status: "done", done_at: new Date().toISOString() } : { status: "todo", done_at: null, review_state: null }).eq("id", p.data.id).select("project_id").single();
  revalidateWork(data?.project_id);
}

export async function setTaskStatus(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const p = z.object({ id: uuid, status: z.enum(["todo", "in_progress", "review", "done"]) }).safeParse(form(fd));
  if (!p.success) return;
  if (p.data.status === "done" && s.staffRole === "employee") p.data.status = "review";
  const patch: Record<string, unknown> = { status: p.data.status, done_at: p.data.status === "done" ? new Date().toISOString() : null };
  if (p.data.status === "review") patch.review_state = "requested";
  if (p.data.status !== "review" && p.data.status !== "done") patch.review_state = null;
  const { data } = await s.supabase.from("tasks").update(patch).eq("id", p.data.id).select("project_id").single();
  revalidateWork(data?.project_id);
}

/** Sends a task to someone else to check. */
export async function requestTaskReview(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const p = z.object({ id: uuid, reviewer: uuid }).safeParse(form(fd));
  if (!p.success) return { error: "Choose who should review it." };
  const { data: t } = await s.supabase.from("tasks").select("assignee, project_id, title").eq("id", p.data.id).single();
  if (!t) return { error: "Task not found." };
  if (t.assignee === p.data.reviewer) return { error: "Pick someone other than the person who did the task." };
  const { error } = await s.supabase.from("tasks").update({ reviewer: p.data.reviewer, status: "review", review_state: "requested", review_note: null, reviewed_by: null, reviewed_at: null }).eq("id", p.data.id);
  if (error) return { error: error.message };
  revalidateWork(t.project_id);
  return { ok: "Sent for review." };
}

/** The reviewer approves the task (it's done) or sends it back with a note. Never the person who did it. */
export async function reviewTask(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const p = z.object({ id: uuid, decision: z.enum(["approve", "changes"]), note: text(1000) }).safeParse(form(fd));
  if (!p.success) return first(p.error);
  const { data: t } = await s.supabase.from("tasks").select("assignee, reviewer, project_id").eq("id", p.data.id).single();
  if (!t) return { error: "Task not found." };
  if (t.assignee === s.user.id) return { error: "Someone other than the person who did the task has to review it." };
  if (t.reviewer && t.reviewer !== s.user.id && s.staffRole !== "admin") return { error: "This review is assigned to someone else." };
  if (p.data.decision === "changes" && !p.data.note) return { error: "Say what needs to change." };
  const now = new Date().toISOString();
  const { error } = await s.supabase.from("tasks").update(p.data.decision === "approve"
    ? { status: "done", done_at: now, review_state: "approved", review_note: p.data.note, reviewed_by: s.user.id, reviewed_at: now }
    : { status: "in_progress", done_at: null, review_state: "changes", review_note: p.data.note, reviewed_by: s.user.id, reviewed_at: now }).eq("id", p.data.id);
  if (error) return { error: error.message };
  revalidateWork(t.project_id);
  return { ok: p.data.decision === "approve" ? "Approved and marked done." : "Sent back with your note." };
}

export async function deleteTask(fd: FormData) {
  const s = await staffOrNull(["admin"]);
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const { data } = await s.supabase.from("tasks").delete().eq("id", id.data).select("project_id").single();
  revalidateWork(data?.project_id);
}

// ----------------------------------------------------------------- finance
const Item = z.object({ description: z.string().trim().min(1).max(300), quantity: z.coerce.number().positive().max(1e6), unit_price_kes: z.coerce.number().min(0).max(1e10) });
const InvoiceIn = z.object({
  client_id: z.string(),
  new_client_name: z.string().trim().max(160).optional(),
  new_client_email: z.string().trim().email("Enter a valid client email").max(160).optional().or(z.literal("")),
  new_client_country: z.string().trim().max(80).optional(),
  project_id: optUuid,
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vat_rate: z.coerce.number().min(0).max(100),
  notes: text(2000),
  items: z.string().transform((s, ctx) => {
    try {
      return z.array(Item).min(1).max(50).parse(JSON.parse(s));
    } catch {
      ctx.addIssue({ code: "custom", message: "Add at least one line item with a description, quantity and price." });
      return z.NEVER;
    }
  }),
});

export async function createInvoice(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull(["finance"]);
  if (!s) return DENIED;
  const values = form(fd);
  const p = InvoiceIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  if (p.data.due_date < p.data.issue_date) return { error: "The due date is before the issue date." };
  const { items, new_client_name, new_client_email, new_client_country, client_id, ...head } = p.data;
  let clientId = client_id;
  if (client_id === "new") {
    if (!new_client_name || new_client_name.length < 2) return { error: "Enter the new client's name." };
    const { data: c, error: ce } = await s.supabase.from("clients")
      .insert({ name: new_client_name, email: new_client_email || null, country: new_client_country || "Kenya", stage: "active" }).select("id").single();
    if (ce || !c) return { error: ce?.message ?? "Could not add the client." };
    clientId = c.id;
  } else if (!uuid.safeParse(client_id).success) return { error: "Choose a client." };
  const { data: inv, error } = await s.supabase.from("invoices").insert({ ...head, client_id: clientId, created_by: s.user.id }).select("id").single();
  if (error || !inv) return { error: error?.message ?? "Could not create the invoice." };
  const { error: e2 } = await s.supabase.from("invoice_items").insert(items.map((it, i) => ({ ...it, invoice_id: inv.id, sort: i })));
  if (e2) return { error: e2.message };
  revalidatePath("/admin/finance");
  redirect(`/admin/finance/invoices/${inv.id}`);
}

export async function sendInvoice(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull(["finance"]);
  if (!s) return DENIED;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { error: "Bad request." };
  const inv = await loadInvoice(s.supabase, id.data);
  if (!inv) return { error: "Invoice not found." };
  if (!inv.client.email) return { error: "Add an email address to this client first." };
  if (inv.status === "cancelled") return { error: "This invoice is cancelled." };

  const issuer = await loadIssuer();
  const pdf = await renderInvoicePdf(inv, issuer, paystackConfigured() ? invoicePayUrl(inv.id) : undefined);
  await sendEmail({
    template: "invoice",
    to: inv.client.email,
    subject: `Invoice ${inv.number} from Dhow Partners`,
    html: emailLayout(`Invoice ${inv.number}`, [
      `Hello ${inv.client.name},`,
      `Please find attached invoice ${inv.number} for ${kes(inv.total_kes - inv.paid_kes)}, due on ${new Date(inv.due_date).toDateString()}.`,
      paystackConfigured() ? "You can pay online by M-Pesa or card using the button below, or by bank transfer or M-Pesa Paybill as shown on the invoice." : "Bank and M-Pesa Paybill details are on the invoice.",
      "Thank you for working with Dhow Partners.",
    ], paystackConfigured() ? { label: `Pay ${kes(inv.total_kes - inv.paid_kes)} online`, href: invoicePayUrl(inv.id) } : undefined),
    attachments: [{ filename: `Dhow-Partners-Invoice-${inv.number}.pdf`, content: pdf }],
  });
  if (inv.status === "draft") await s.supabase.from("invoices").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", inv.id);
  else await s.supabase.from("invoices").update({ sent_at: new Date().toISOString() }).eq("id", inv.id);
  await createAdminClient().rpc("recalc_invoice", { p_invoice: inv.id });
  revalidatePath(`/admin/finance/invoices/${inv.id}`);
  return { ok: `Sent to ${inv.client.email}.` };
}

export async function recordPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull(["finance"]);
  if (!s) return DENIED;
  const p = z.object({
    invoice_id: uuid,
    amount_kes: z.coerce.number().positive("Enter the amount received"),
    method: z.enum(["M-Pesa", "I&M Bank", "Airtel Money", "Card (Paystack)", "Cash", "Other"]),
    reference: text(80),
    paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).safeParse(form(fd));
  if (!p.success) return first(p.error);
  const { data: inv } = await s.supabase.from("invoices").select("status").eq("id", p.data.invoice_id).single();
  if (inv?.status === "draft") await s.supabase.from("invoices").update({ status: "sent" }).eq("id", p.data.invoice_id);
  const { error } = await s.supabase.from("invoice_payments").insert(p.data);
  if (error) return { error: error.message };
  revalidatePath(`/admin/finance/invoices/${p.data.invoice_id}`);
  revalidatePath("/admin/finance");
  return { ok: `Recorded ${kes(p.data.amount_kes)}.` };
}

/** One click: records the full balance as paid today. */
export async function markInvoicePaid(fd: FormData) {
  const s = await staffOrNull(["finance"]);
  if (!s) return;
  const p = z.object({ id: uuid, method: z.enum(["M-Pesa", "I&M Bank", "Airtel Money", "Cash", "Other"]) }).safeParse(form(fd));
  if (!p.success) return;
  const { data: inv } = await s.supabase.from("invoices").select("status, total_kes, paid_kes").eq("id", p.data.id).single();
  if (!inv || inv.status === "cancelled") return;
  const balance = Number(inv.total_kes) - Number(inv.paid_kes);
  if (balance <= 0) return;
  if (inv.status === "draft") await s.supabase.from("invoices").update({ status: "sent" }).eq("id", p.data.id);
  await s.supabase.from("invoice_payments").insert({ invoice_id: p.data.id, amount_kes: balance, method: p.data.method, paid_on: new Date().toISOString().slice(0, 10) });
  revalidatePath(`/admin/finance/invoices/${p.data.id}`);
  revalidatePath("/admin/finance");
}

export async function cancelInvoice(fd: FormData) {
  const s = await staffOrNull(["finance"]);
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  await s.supabase.from("invoices").update({ status: "cancelled" }).eq("id", id.data);
  revalidatePath(`/admin/finance/invoices/${id.data}`);
  revalidatePath("/admin/finance");
}

const BILL_CATEGORIES = ["rent", "salary", "registration", "licence", "tax", "utilities", "software", "marketing", "event", "travel", "office", "bank", "partner", "other"] as const;
const BillIn = z.object({
  id: optUuid,
  paid_now: z.enum(["on"]).optional().transform((v) => v === "on"),
  description: z.string().trim().min(2, "Say what the bill is for").max(300), partner_id: optUuid, project_id: optUuid,
  amount_kes: z.coerce.number().positive("Enter the amount"), due_date: date,
  category: z.enum(BILL_CATEGORIES).default("other"), payee: text(160), repeats: z.enum(["once", "monthly", "yearly"]).default("once"), notes: text(1000),
});
/** Adds a bill or expense, or saves changes to one. "Already paid" records it as spent today. */
export async function addBill(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull(["finance"]);
  if (!s) return DENIED;
  const values = form(fd);
  const p = BillIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  const { id, paid_now, ...row } = p.data;
  const today = new Date().toISOString().slice(0, 10);
  const paid = paid_now ? { paid_kes: row.amount_kes, paid_on: row.due_date ?? today } : {};
  if (id) {
    const { data: cur } = await s.supabase.from("bills").select("paid_kes").eq("id", id).single();
    const { error } = await s.supabase.from("bills").update({ ...row, ...(paid_now ? paid : { paid_kes: Math.min(Number(cur?.paid_kes ?? 0), row.amount_kes) }) }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/finance");
    return { ok: "Saved." };
  }
  const { error } = await s.supabase.from("bills").insert({ ...row, ...paid });
  if (error) return { error: error.message };
  revalidatePath("/admin/finance");
  return { ok: paid_now ? "Expense recorded." : "Bill added." };
}

export async function deleteBill(fd: FormData) {
  const s = await staffOrNull(["finance"]);
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  await s.supabase.from("bills").delete().eq("id", id.data);
  revalidatePath("/admin/finance");
}

/** Saves changes to an invoice: client, dates, VAT, note and all its lines. */
export async function updateInvoice(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull(["finance"]);
  if (!s) return DENIED;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { error: "Bad request." };
  const values = form(fd);
  const p = InvoiceIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  if (p.data.due_date < p.data.issue_date) return { error: "The due date is before the issue date." };
  const { data: cur } = await s.supabase.from("invoices").select("status").eq("id", id.data).single();
  if (!cur) return { error: "Invoice not found." };
  if (cur.status === "cancelled") return { error: "This invoice is cancelled." };
  const { items, new_client_name, new_client_email, new_client_country, client_id, ...head } = p.data;
  let clientId = client_id;
  if (client_id === "new") {
    if (!new_client_name || new_client_name.length < 2) return { error: "Enter the new client's name." };
    const { data: c, error: ce } = await s.supabase.from("clients").insert({ name: new_client_name, email: new_client_email || null, country: new_client_country || "Kenya", stage: "active" }).select("id").single();
    if (ce || !c) return { error: ce?.message ?? "Could not add the client." };
    clientId = c.id;
  } else if (!uuid.safeParse(client_id).success) return { error: "Choose a client." };
  const { error } = await s.supabase.from("invoices").update({ ...head, client_id: clientId }).eq("id", id.data);
  if (error) return { error: error.message };
  await s.supabase.from("invoice_items").delete().eq("invoice_id", id.data);
  const { error: e2 } = await s.supabase.from("invoice_items").insert(items.map((it, i) => ({ ...it, invoice_id: id.data, sort: i })));
  if (e2) return { error: e2.message };
  await createAdminClient().rpc("recalc_invoice", { p_invoice: id.data });
  revalidatePath("/admin/finance");
  revalidatePath(`/admin/finance/invoices/${id.data}`);
  redirect(`/admin/finance/invoices/${id.data}`);
}

/** Removes an invoice made by mistake. One that has payments recorded can only be cancelled. */
export async function deleteInvoice(fd: FormData) {
  const s = await staffOrNull(["finance"]);
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const { data: inv } = await s.supabase.from("invoices").select("paid_kes").eq("id", id.data).single();
  if (!inv || Number(inv.paid_kes) > 0) return;
  await s.supabase.from("invoice_items").delete().eq("invoice_id", id.data);
  await s.supabase.from("invoices").delete().eq("id", id.data);
  revalidatePath("/admin/finance");
  redirect("/admin/finance");
}

export async function payBill(fd: FormData) {
  const s = await staffOrNull(["finance"]);
  if (!s) return;
  const p = z.object({ id: uuid, amount_kes: z.coerce.number().positive() }).safeParse(form(fd));
  if (!p.success) return;
  const { data: b } = await s.supabase.from("bills").select("*").eq("id", p.data.id).single();
  if (!b) return;
  const paid = Math.min(Number(b.amount_kes), Number(b.paid_kes) + p.data.amount_kes);
  await s.supabase.from("bills").update({ paid_kes: paid, ...(paid >= Number(b.amount_kes) ? { paid_on: new Date().toISOString().slice(0, 10) } : {}) }).eq("id", p.data.id);
  // Rent, salaries and other repeating bills: once paid, the next one is added automatically.
  if (paid >= Number(b.amount_kes) && b.repeats !== "once" && b.due_date) {
    const d = new Date(b.due_date);
    if (b.repeats === "monthly") d.setMonth(d.getMonth() + 1); else d.setFullYear(d.getFullYear() + 1);
    const next = d.toISOString().slice(0, 10);
    const { data: exists } = await s.supabase.from("bills").select("id").eq("description", b.description).eq("due_date", next).maybeSingle();
    if (!exists) await s.supabase.from("bills").insert({ description: b.description, partner_id: b.partner_id, project_id: b.project_id, amount_kes: b.amount_kes, due_date: next, category: b.category, payee: b.payee, repeats: b.repeats, notes: b.notes });
  }
  revalidatePath("/admin/finance");
}

// ----------------------------------------------------------------- marketplace
const OppIn = z.object({
  id: optUuid,
  kind: z.enum(["rfp", "tender", "grant", "event", "program"]),
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().max(500).default(""),
  body: z.string().trim().max(20000).default(""),
  source: text(120), location: text(120), deadline: date,
  url: z.string().trim().url().optional().or(z.literal("")).transform((v) => v || null),
  image_url: z.string().trim().optional().transform((v) => (v && /^https:\/\//i.test(v) ? v : null)),
  eligibility: z.string().optional().transform(lines),
  benefits: z.string().optional().transform(lines),
  sectors: z.string().optional().transform((v) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 6)),
  apply_url: z.string().trim().url().optional().or(z.literal("")).transform((v) => v || null),
  about: z.string().trim().max(3000).default(""),
  dhow_note: z.string().trim().max(600).default(""),
  starts_on: date, ends_on: date, venue: text(160),
  requires_verified: z.enum(["on"]).optional().transform((v) => v === "on"),
  published: z.enum(["on"]).optional().transform((v) => v === "on"),
  featured: z.enum(["on"]).optional().transform((v) => v === "on"),
});
function lines(v?: string) {
  return (v ?? "").split("\n").map((x) => x.replace(/^[\s•\-*]+/, "").trim()).filter(Boolean).slice(0, 6).map((x) => x.slice(0, 200));
}
export async function saveOpportunity(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const values = form(fd);
  const p = OppIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  const { id, ...row } = p.data;
  const { error } = id ? await s.supabase.from("opportunities").update(row).eq("id", id) : await s.supabase.from("opportunities").insert({ ...row, created_by: s.user.id });
  if (error) return { error: error.message };
  revalidatePath("/admin/opportunities");
  revalidatePath("/app/opportunities");
  revalidatePath("/app/events");
  if (!id) redirect("/admin/opportunities?tab=live");
  return { ok: row.published ? "Saved and published." : "Saved as a draft." };
}

export async function toggleFeatured(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  await s.supabase.from("opportunities").update({ featured: fd.get("value") === "1" }).eq("id", id.data);
  revalidatePath("/admin/opportunities");
  revalidatePath("/app/opportunities");
  revalidatePath("/app/events");
}

// ----------------------------------------------------------------- imported opportunities
export async function publishOpportunity(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const publish = fd.get("publish") !== "0";
  await s.supabase.from("opportunities").update({ published: publish }).eq("id", id.data);
  revalidatePath("/admin/opportunities");
  revalidatePath("/app/opportunities");
}

export async function deleteOpportunity(fd: FormData) {
  const s = await staffOrNull(["admin"]);
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  // Imported drafts are removed; the external id stays known so the post isn't imported again.
  const { data } = await s.supabase.from("opportunities").select("external_id").eq("id", id.data).single();
  if (data?.external_id) await s.supabase.from("opportunities").update({ published: false, dismissed_at: new Date().toISOString() }).eq("id", id.data);
  else await s.supabase.from("opportunities").delete().eq("id", id.data);
  revalidatePath("/admin/opportunities");
  revalidatePath("/app/opportunities");
}

export async function importOpportunitiesNow(): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const { enrichImported, importAllSources, retireExpired } = await import("@/lib/opportunity-import");
  await retireExpired().catch(() => 0);
  const results = await importAllSources();
  await enrichImported(15).catch(() => 0);
  revalidatePath("/admin/opportunities");
  const added = results.reduce((n, r) => n + r.added, 0);
  const failed = results.filter((r) => r.error);
  return failed.length && !added
    ? { error: `Import failed: ${failed.map((f) => `${f.name}: ${f.error}`).join("; ")}` }
    : { ok: `${added} new ${added === 1 ? "opportunity" : "opportunities"} to review.${failed.length ? ` ${failed.length} source(s) had a problem.` : ""}` };
}

const SourceIn = z.object({
  id: optUuid,
  name: z.string().trim().min(2).max(80),
  kind: z.enum(["wordpress", "rss", "grants_gov"]),
  url: z.string().trim().url().refine((u) => u.startsWith("https://"), "Use an https:// address"),
  auto_publish: z.enum(["on"]).optional().transform((v) => v === "on"),
  requires_verified: z.enum(["on"]).optional().transform((v) => v === "on"),
  active: z.enum(["on"]).optional().transform((v) => v === "on"),
});
export async function saveSource(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const values = form(fd);
  const p = SourceIn.safeParse(values);
  if (!p.success) return first(p.error, values);
  const { id, ...row } = p.data;
  const { error } = id ? await s.supabase.from("opportunity_sources").update(row).eq("id", id) : await s.supabase.from("opportunity_sources").insert({ ...row, active: true });
  if (error) return { error: error.code === "23505" ? "That source is already added." : error.message };
  revalidatePath("/admin/opportunities");
  return { ok: "Source saved." };
}

export async function toggleSource(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const field = fd.get("field") === "auto_publish" ? "auto_publish" : "active";
  await s.supabase.from("opportunity_sources").update({ [field]: fd.get("value") === "1" }).eq("id", id.data);
  revalidatePath("/admin/opportunities");
}

export async function setApplicationStatus(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const p = z.object({ id: uuid, status: z.enum(["submitted", "shortlisted", "won", "lost"]), staff_note: text(1000) }).safeParse(form(fd));
  if (!p.success) return;
  const db = createAdminClient();
  const { data: app } = await db.from("applications").update({ status: p.data.status, staff_note: p.data.staff_note }).eq("id", p.data.id).select("org_id, opportunities(title)").single();
  const title = (app as unknown as { opportunities?: { title: string } } | null)?.opportunities?.title;
  if (app && ["shortlisted", "won", "lost"].includes(p.data.status)) {
    const words = { shortlisted: "has been shortlisted", won: "was successful", lost: "wasn't successful this time" }[p.data.status as "shortlisted" | "won" | "lost"];
    await notifyOrg(app.org_id, `application_${p.data.status}`, `Update on ${title}`, [`Your application for "${title}" ${words}.`, p.data.staff_note ?? ""].filter(Boolean),
      `Dhow Partners: your application for "${title}" ${words}.`, { label: "View applications", href: `${appUrl()}/app/applications` });
  }
  revalidatePath("/admin/opportunities");
}


// ----------------------------------------------------------------- staff roles (admins only)
export async function setStaffRole(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull(["admin"]);
  if (!s) return DENIED;
  const p = z.object({ email: z.string().trim().toLowerCase().email(), role: z.enum(["none", "employee", "reviewer", "finance", "admin"]) }).safeParse(form(fd));
  if (!p.success) return { error: "Enter a valid email." };
  const db = createAdminClient();
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = list.users.find((u) => u.email?.toLowerCase() === p.data.email);
  if (!user) {
    // No account yet: save an invite. They get the role automatically when they sign up with this email.
    if (p.data.role === "none") {
      await db.from("staff_invites").delete().eq("email", p.data.email);
      revalidatePath("/admin/team");
      return { ok: `Invite for ${p.data.email} removed.` };
    }
    const { error } = await db.from("staff_invites").upsert({ email: p.data.email, role: p.data.role, invited_by: s.user.id });
    if (error) return { error: "Couldn't save the invite. Please try again." };
    revalidatePath("/admin/team");
    return { ok: `${p.data.email} will be ${p.data.role} as soon as they create an account with that email.` };
  }
  if (user.id === s.user.id && p.data.role !== "admin") return { error: "You can't remove your own admin role." };
  await db.from("profiles").update({ staff_role: p.data.role === "none" ? null : p.data.role }).eq("id", user.id);
  revalidatePath("/admin/team");
  return { ok: p.data.role === "none" ? `${p.data.email} is no longer staff.` : `${p.data.email} is now ${p.data.role}.` };
}

// ----------------------------------------------------------------- calendar
/** Forget this person's Google Calendar connection. Only ever touches their own row. */
export async function disconnectCalendar(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const provider = fd.get("provider") === "microsoft" ? "microsoft" : "google";
  await createAdminClient().from("calendar_connections").delete().eq("user_id", s.user.id).eq("provider", provider);
  revalidatePath("/admin/calendar");
  revalidatePath("/admin");
}

// ----------------------------------------------------------------- client partners and bank balance
const AssignIn = z.object({
  client_id: uuid, partner_id: uuid, service: text(200),
  agreed_pct: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).max(100).nullable()),
});
export async function assignPartner(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const p = AssignIn.safeParse(form(fd));
  if (!p.success) return { error: "Choose a partner." };
  let pct = p.data.agreed_pct;
  if (pct == null) {
    // The partner's rate for this service if they have one, otherwise their default.
    const { data: partner } = await s.supabase.from("partners").select("agreed_pct, service_rates").eq("id", p.data.partner_id).single();
    const wanted = (p.data.service ?? "").trim().toLowerCase();
    const rate = Array.isArray(partner?.service_rates) ? (partner.service_rates as { service: string; pct: number | null }[]).find((r) => r.service.trim().toLowerCase() === wanted) : undefined;
    pct = rate?.pct ?? partner?.agreed_pct ?? null;
  }
  const { error } = await s.supabase.from("client_partners").insert({ ...p.data, agreed_pct: pct });
  if (error) return { error: error.code === "23505" ? "That partner is already on this client for that work." : error.message };
  revalidatePath(`/admin/clients/${p.data.client_id}`);
  return { ok: "Partner assigned." };
}

export async function updateClientPartner(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const p = z.object({ id: uuid, action: z.enum(["done", "active", "remove"]) }).safeParse(form(fd));
  if (!p.success) return;
  if (p.data.action === "remove" && s.staffRole !== "admin") return;
  const q = p.data.action === "remove"
    ? s.supabase.from("client_partners").delete().eq("id", p.data.id).select("client_id").single()
    : s.supabase.from("client_partners").update({ status: p.data.action }).eq("id", p.data.id).select("client_id").single();
  const { data } = await q;
  if (data) revalidatePath(`/admin/clients/${data.client_id}`);
}

export async function setBankBalance(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull(["finance"]);
  if (!s) return DENIED;
  const p = z.object({ bank_balance: z.coerce.number().min(-1e12).max(1e12), bank_balance_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(form(fd));
  if (!p.success) return { error: "Enter the balance and the statement date." };
  const { error } = await createAdminClient().from("dhow_profile").update(p.data).eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/admin/finance");
  return { ok: "Balance updated." };
}

/** Admins only: removes a member company and everything it uploaded. */
export async function deleteOrganization(fd: FormData) {
  const s = await staffOrNull(["admin"]);
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const db = createAdminClient();
  const { data: docs } = await db.from("documents").select("object_key").eq("org_id", id.data);
  const { deleteObject } = await import("@/lib/r2");
  await Promise.all((docs ?? []).map((d) => deleteObject(d.object_key).catch(() => null)));
  await db.from("organizations").delete().eq("id", id.data);
  revalidatePath("/admin/members");
  redirect("/admin/members");
}

/** Splits one CSV line, honouring quotes. */
function csvCells(line: string) {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === "," || ch === "\t" || ch === ";") { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Adds many people to Leads at once from a CSV file or pasted rows: name, company, email, phone, notes. */
export async function importLeads(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const f = fd.get("file");
  let text = String(fd.get("rows") ?? "");
  if (f && typeof f === "object" && "size" in f && (f as File).size > 0) {
    if ((f as File).size > 1024 * 1024) return { error: "Keep the file under 1 MB." };
    text = await (f as File).text();
  }
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { error: "Upload a CSV file or paste the people, one per line." };
  let cols = ["name", "company", "email", "phone", "notes"];
  const head = csvCells(lines[0]).map((h) => h.toLowerCase());
  if (head.some((h) => /name|company|email|phone|note/.test(h))) {
    cols = head.map((h) => (/e-?mail/.test(h) ? "email" : /phone|mobile|tel|whatsapp/.test(h) ? "phone" : /company|organi[sz]ation|business|firm/.test(h) ? "company" : /note|comment|status|how/.test(h) ? "notes" : /need|interest|service/.test(h) ? "need" : /name|contact|person/.test(h) ? "name" : "skip"));
    lines.shift();
  }
  const source = String(fd.get("source") ?? "List").slice(0, 60) || "List";
  const rows = lines.slice(0, 500).map((l) => {
    const c = csvCells(l); const r: Record<string, string> = {};
    cols.forEach((k, i) => { if (k !== "skip" && c[i]) r[k] = c[i].slice(0, k === "notes" ? 2000 : 160); });
    const who = r.name || r.company || r.email || r.phone;
    if (!who) return null;
    return {
      name: (r.need || (r.name && r.company ? `${r.name}, ${r.company}` : who)).slice(0, 200),
      company: r.company ?? null, email: r.email && /@/.test(r.email) ? r.email.toLowerCase() : null, phone: r.phone ?? null,
      notes: [r.need && r.name ? `Contact: ${r.name}` : null, r.notes].filter(Boolean).join("\n") || null,
      source, status: "new" as const, owner: s.user.id,
    };
  }).filter(Boolean) as Record<string, unknown>[];
  if (!rows.length) return { error: "No people found. Each line needs at least a name, company, email or phone." };
  const { error } = await s.supabase.from("leads").insert(rows);
  if (error) return { error: error.message };
  revalidatePath("/admin/leads");
  return { ok: `Added ${rows.length} ${rows.length === 1 ? "person" : "people"} to New.` };
}
