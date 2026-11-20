"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { staffOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideVerification } from "@/lib/workflows";
import { loadInvoice } from "@/lib/invoices";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { emailLayout, notifyOrg, sendEmail } from "@/lib/notify";
import { kes } from "@/lib/format";
import type { ActionState } from "@/components/forms";

// Every action checks the caller's staff role first. Most writes then go through
// the caller's own client, so row-level security checks them a second time.

const DENIED: ActionState = { error: "You don't have access to do that." };
const text = (max = 500) => z.string().trim().max(max).optional().transform((v) => v || null);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null);
const money = z.preprocess((v) => (v === "" || v === undefined || v === null ? null : Number(v)), z.number().min(0).max(1e12).nullable());
const uuid = z.string().uuid();
const optUuid = z.string().uuid().optional().or(z.literal("")).transform((v) => v || null);
const first = (e: z.ZodError) => ({ error: e.issues[0]?.message ?? "Check the form." });
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
  const p = ClientIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
  const { id, ...row } = p.data;
  const { error } = id ? await s.supabase.from("clients").update(row).eq("id", id) : await s.supabase.from("clients").insert({ ...row, account_lead: s.user.id });
  if (error) return { error: error.message };
  revalidatePath("/admin/clients");
  return { ok: id ? "Client saved." : "Client added." };
}

const LeadIn = z.object({
  id: optUuid,
  name: z.string().trim().min(2, "Describe the lead").max(200),
  company: text(160), email: text(160), phone: text(40), source: text(60), next_step: text(300),
  next_step_date: date, est_value_kes: money,
  status: z.enum(["new", "contacted", "call_booked", "plan_sent", "won", "lost"]),
});
export async function saveLead(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const p = LeadIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
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
  const p = PartnerIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
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
  const p = ContactIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
  const { error } = await s.supabase.from("contacts").insert(p.data);
  if (error) return { error: error.message };
  revalidatePath("/admin/clients");
  revalidatePath("/admin/partners");
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
  const p = ProjectIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
  const { id, ...row } = p.data;
  const { error } = id ? await s.supabase.from("projects").update(row).eq("id", id) : await s.supabase.from("projects").insert({ ...row, owner: s.user.id });
  if (error) return { error: error.message };
  revalidatePath("/admin/projects");
  return { ok: "Project saved." };
}

export async function setProjectStatus(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const p = z.object({ id: uuid, status: z.enum(["todo", "in_progress", "review", "done"]) }).safeParse(form(fd));
  if (!p.success) return;
  await s.supabase.from("projects").update({ status: p.data.status }).eq("id", p.data.id);
  revalidatePath("/admin/projects");
}

const TaskIn = z.object({ title: z.string().trim().min(2).max(300), project_id: optUuid, due_date: date, priority: z.enum(["low", "medium", "high"]) });
export async function addTask(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const p = TaskIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
  const { error } = await s.supabase.from("tasks").insert({ ...p.data, assignee: s.user.id });
  if (error) return { error: error.message };
  revalidatePath("/admin/projects");
  revalidatePath("/admin");
  return { ok: "Task added." };
}

export async function toggleTask(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const p = z.object({ id: uuid, done: z.enum(["1", "0"]) }).safeParse(form(fd));
  if (!p.success) return;
  await s.supabase.from("tasks").update(p.data.done === "1" ? { status: "done", done_at: new Date().toISOString() } : { status: "todo", done_at: null }).eq("id", p.data.id);
  revalidatePath("/admin/projects");
  revalidatePath("/admin");
}

// ----------------------------------------------------------------- finance
const Item = z.object({ description: z.string().trim().min(1).max(300), quantity: z.coerce.number().positive().max(1e6), unit_price_kes: z.coerce.number().min(0).max(1e10) });
const InvoiceIn = z.object({
  client_id: uuid,
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
  const p = InvoiceIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
  if (p.data.due_date < p.data.issue_date) return { error: "The due date is before the issue date." };
  const { items, ...head } = p.data;
  const { data: inv, error } = await s.supabase.from("invoices").insert({ ...head, created_by: s.user.id }).select("id").single();
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

  const pdf = await renderInvoicePdf(inv);
  await sendEmail({
    template: "invoice",
    to: inv.client.email,
    subject: `Invoice ${inv.number} from Dhow Partners`,
    html: emailLayout(`Invoice ${inv.number}`, [
      `Hello ${inv.client.name},`,
      `Please find attached invoice ${inv.number} for ${kes(inv.total_kes - inv.paid_kes)}, due on ${new Date(inv.due_date).toDateString()}.`,
      "Thank you for working with Dhow Partners.",
    ]),
    attachments: [{ filename: `Dhow-Partners-Invoice-${inv.number}.pdf`, content: pdf }],
  });
  if (inv.status === "draft") await s.supabase.from("invoices").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", inv.id);
  else await s.supabase.from("invoices").update({ sent_at: new Date().toISOString() }).eq("id", inv.id);
  await s.supabase.rpc("recalc_invoice", { p_invoice: inv.id });
  revalidatePath(`/admin/finance/invoices/${inv.id}`);
  return { ok: `Sent to ${inv.client.email}.` };
}

export async function recordPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull(["finance"]);
  if (!s) return DENIED;
  const p = z.object({
    invoice_id: uuid,
    amount_kes: z.coerce.number().positive("Enter the amount received"),
    method: z.enum(["M-Pesa", "I&M Bank", "Cash", "Other"]),
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

export async function cancelInvoice(fd: FormData) {
  const s = await staffOrNull(["finance"]);
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  await s.supabase.from("invoices").update({ status: "cancelled" }).eq("id", id.data);
  revalidatePath(`/admin/finance/invoices/${id.data}`);
  revalidatePath("/admin/finance");
}

const BillIn = z.object({ description: z.string().trim().min(2).max(300), partner_id: optUuid, project_id: optUuid, amount_kes: z.coerce.number().positive(), due_date: date });
export async function addBill(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull(["finance"]);
  if (!s) return DENIED;
  const p = BillIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
  const { error } = await s.supabase.from("bills").insert(p.data);
  if (error) return { error: error.message };
  revalidatePath("/admin/finance");
  return { ok: "Bill added." };
}

export async function payBill(fd: FormData) {
  const s = await staffOrNull(["finance"]);
  if (!s) return;
  const p = z.object({ id: uuid, amount_kes: z.coerce.number().positive() }).safeParse(form(fd));
  if (!p.success) return;
  const { data: b } = await s.supabase.from("bills").select("paid_kes, amount_kes").eq("id", p.data.id).single();
  if (!b) return;
  await s.supabase.from("bills").update({ paid_kes: Math.min(Number(b.amount_kes), Number(b.paid_kes) + p.data.amount_kes) }).eq("id", p.data.id);
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
  requires_verified: z.enum(["on"]).optional().transform((v) => v === "on"),
  published: z.enum(["on"]).optional().transform((v) => v === "on"),
});
export async function saveOpportunity(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const p = OppIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
  const { id, ...row } = p.data;
  const { error } = id ? await s.supabase.from("opportunities").update(row).eq("id", id) : await s.supabase.from("opportunities").insert({ ...row, created_by: s.user.id });
  if (error) return { error: error.message };
  revalidatePath("/admin/opportunities");
  revalidatePath("/app/opportunities");
  return { ok: row.published ? "Saved and published." : "Saved as a draft." };
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
      `Dhow Partners: your application for "${title}" ${words}.`, { label: "View applications", href: `${process.env.NEXT_PUBLIC_APP_URL}/app/applications` });
  }
  revalidatePath("/admin/opportunities");
}

// ----------------------------------------------------------------- wiki and links
const WikiIn = z.object({
  id: optUuid,
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes in the address").max(80),
  section: z.string().trim().min(1).max(60),
  body: z.string().max(100_000),
});
export async function saveWikiPage(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const p = WikiIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
  const { id, ...row } = p.data;
  const payload = { ...row, updated_by: s.user.id, updated_at: new Date().toISOString() };
  const { error } = id ? await s.supabase.from("wiki_pages").update(payload).eq("id", id) : await s.supabase.from("wiki_pages").insert(payload);
  if (error) return { error: error.code === "23505" ? "That address is already used by another page." : error.message };
  revalidatePath("/admin/wiki");
  redirect(`/admin/wiki/${row.slug}`);
}

const LinkIn = z.object({ title: z.string().trim().min(2).max(120), url: z.string().trim().url().refine((u) => /^https?:\/\//.test(u), "Links must start with http or https"), category: z.string().trim().min(1).max(60), notes: text(300) });
export async function saveLink(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull();
  if (!s) return DENIED;
  const p = LinkIn.safeParse(form(fd));
  if (!p.success) return first(p.error);
  const { error } = await s.supabase.from("links").insert(p.data);
  if (error) return { error: error.message };
  revalidatePath("/admin/links");
  return { ok: "Link added." };
}

export async function deleteLink(fd: FormData) {
  const s = await staffOrNull();
  if (!s) return;
  const id = uuid.safeParse(fd.get("id"));
  if (id.success) await s.supabase.from("links").delete().eq("id", id.data);
  revalidatePath("/admin/links");
}

// ----------------------------------------------------------------- staff roles (admins only)
export async function setStaffRole(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrNull(["admin"]);
  if (!s) return DENIED;
  const p = z.object({ email: z.string().trim().toLowerCase().email(), role: z.enum(["none", "reviewer", "finance", "admin"]) }).safeParse(form(fd));
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
export async function disconnectCalendar() {
  const s = await staffOrNull();
  if (!s) return;
  await createAdminClient().from("calendar_connections").delete().eq("user_id", s.user.id);
  revalidatePath("/admin/calendar");
  revalidatePath("/admin");
}
