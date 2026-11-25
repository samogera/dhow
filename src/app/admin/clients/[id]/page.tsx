import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Circle, FileText, Mail, Phone, Plus, UserRound } from "lucide-react";
import { requireStaff, seesMoney } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Drawer } from "@/components/drawer";
import { ButtonLink, Card, CardHeader, Field, Input, Select, Stat, StatusBadge } from "@/components/ui";
import { Avatar } from "@/components/profile-bits";
import { ClientFields, type ClientRow } from "@/components/client-fields";
import { cn, day, kes } from "@/lib/format";
import { assignPartner, linkClientOrg, saveClient, saveContact, saveProject, updateClientPartner } from "@/actions/admin";
import { makeClientLink } from "@/actions/profiles";
import { CopyField } from "@/components/copy-field";
import { appUrl } from "@/lib/app-url";
import { Star } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await requireStaff();
  const money = seesMoney(s.staffRole);
  const db = s.supabase;
  const [{ data: c }, { data: invoices }, { data: projects }, { data: contacts }, { data: links }, { data: partners }] = await Promise.all([
    db.from("clients").select("*").eq("id", id).maybeSingle(),
    db.from("invoices").select("id, number, status, issue_date, due_date, total_kes, paid_kes").eq("client_id", id).order("issue_date", { ascending: false }),
    db.from("projects").select("id, name, status, due_date, fee_kes").eq("client_id", id).order("created_at", { ascending: false }),
    db.from("contacts").select("id, name, role, email, phone").eq("client_id", id),
    db.from("client_partners").select("id, service, agreed_pct, status, partners(id, name, industry, logo_url)").eq("client_id", id).order("created_at"),
    db.from("partners").select("id, name, agreed_pct, service_rates").neq("status", "rejected").order("name"),
  ]);
  if (!c) notFound();
  const client = c as ClientRow;
  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: tasks } = projectIds.length
    ? await db.from("tasks").select("id, title, status, due_date, project_id, assignee").in("project_id", projectIds).neq("status", "done").order("due_date", { ascending: true, nullsFirst: false })
    : { data: [] as { id: string; title: string; status: string; due_date: string | null; project_id: string; assignee: string | null }[] };
  const { data: staff } = await db.from("profiles").select("id, full_name").not("staff_role", "is", null);
  const { data: orgs } = await db.from("organizations").select("id, name").order("name").limit(1000);
  const { data: reviews } = await db.from("client_reviews").select("*").eq("client_id", id).order("created_at", { ascending: false });
  const token = (c as { portal_token?: string | null }).portal_token;

  const live = (invoices ?? []).filter((i) => i.status !== "cancelled" && i.status !== "draft");
  const billed = live.reduce((n, i) => n + Number(i.total_kes), 0);
  const paid = live.reduce((n, i) => n + Number(i.paid_kes), 0);
  const owed = billed - paid;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = live.filter((i) => Number(i.total_kes) > Number(i.paid_kes) && i.due_date < today);
  const who = (uid: string | null) => staff?.find((x) => x.id === uid)?.full_name ?? "Unassigned";
  const pname = (pid: string) => projects?.find((p) => p.id === pid)?.name ?? "";

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/clients" className="mb-5 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />All clients</Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar name={client.name} size="lg" />
          <div className="min-w-0 flex-1">
            <StatusBadge status={client.stage} />
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">{client.name}</h1>
            <p className="mt-1 text-muted">{[client.sector, client.client_type, client.country].filter(Boolean).join(" · ") || "Add sector and type"}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {client.email ? <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-navy-600"><Mail className="size-4" />{client.email}</a> : null}
              {client.phone ? <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-navy-600"><Phone className="size-4" />{client.phone}</a> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/admin/finance/invoices/new?client=${client.id}`}><FileText className="size-4" />New invoice</ButtonLink>
            <Drawer label="Edit" title={`Edit ${client.name}`} variant="outline" plus={false}>
              <ActionForm action={saveClient} className="grid gap-3 sm:grid-cols-2"><ClientFields c={client} /></ActionForm>
            </Drawer>
          </div>
        </div>
        {client.notes ? <p className="mt-5 whitespace-pre-line border-t border-line pt-5 text-sm text-ink/80">{client.notes}</p> : null}
      </Card>

      <div className={cn("mt-4 grid grid-cols-2 gap-3 sm:gap-4", money ? "lg:grid-cols-4" : "lg:grid-cols-2")}>
        {money ? <><Stat label="Billed" value={kes(billed)} note={`${live.length} invoice${live.length === 1 ? "" : "s"}`} />
        <Stat label="Paid to us" value={kes(paid)} />
        <Stat label="Owed to us" value={kes(owed)} note={overdue.length ? `${overdue.length} overdue` : "Nothing overdue"} highlight={owed > 0} /></> : null}
        {money ? null : <Stat label="Open projects" value={(projects ?? []).filter((p) => p.status !== "done").length} note={`${projects?.length ?? 0} in total`} />}
        <Stat label="Open tasks" value={tasks?.length ?? 0} note={`${(projects ?? []).filter((p) => p.status !== "done").length} open projects`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {money ? <Card>
            <CardHeader title="Invoices and payments" />
            {invoices?.length ? (
              <ul className="divide-y divide-line">
                {invoices.map((i) => {
                  const bal = Number(i.total_kes) - Number(i.paid_kes);
                  const late = bal > 0 && i.due_date < today && i.status !== "draft" && i.status !== "cancelled";
                  return (
                    <li key={i.id}>
                      <Link href={`/admin/finance/invoices/${i.id}`} className="flex items-center gap-3 py-3 hover:text-navy-700">
                        <div className="min-w-0 flex-1"><p className="font-medium">Invoice {i.number}</p><p className={cn("text-xs", late ? "font-medium text-bad" : "text-muted")}>Issued {day(i.issue_date)} · due {day(i.due_date)}</p></div>
                        <div className="text-right"><p className="num text-sm font-medium">{kes(i.total_kes)}</p>{bal > 0 && i.status !== "cancelled" ? <p className="num text-xs text-amber-700">{kes(bal)} left</p> : null}</div>
                        <StatusBadge status={late ? "overdue" : i.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-muted">No invoices yet.</p>}
          </Card> : null}

          <Card>
            <CardHeader title="Projects" action={
              <Drawer label="Project" title={`New project for ${client.name}`} variant="outline">
                <ActionForm action={saveProject} submit="Create project" className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="client_id" value={client.id} /><input type="hidden" name="status" value="todo" /><input type="hidden" name="priority" value="medium" />
                  <div className="sm:col-span-2"><Field label="Name"><Input name="name" required /></Field></div>
                  {money ? <Field label="Fee (KES)"><Input name="fee_kes" type="number" min="0" step="any" /></Field> : null}
                  <Field label="Due"><Input name="due_date" type="date" /></Field>
                </ActionForm>
              </Drawer>} />
            {projects?.length ? (
              <ul className="space-y-2">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/projects/${p.id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-sunken/60 px-4 py-3 hover:bg-sunken">
                      <div className="min-w-0"><p className="truncate font-medium">{p.name}</p><p className="text-xs text-muted">{p.due_date ? `Due ${day(p.due_date)}` : "No due date"}{money && p.fee_kes ? ` · ${kes(p.fee_kes)}` : ""}</p></div>
                      <StatusBadge status={p.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No projects yet.</p>}
          </Card>

          <Card>
            <CardHeader title="Pending tasks" sub="Across all of this client's projects" />
            {tasks?.length ? (
              <ul className="divide-y divide-line">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <Link href={`/admin/projects/${t.project_id}`} className="flex items-start gap-3 py-3 hover:text-navy-700">
                      <Circle className="mt-0.5 size-4 shrink-0 text-faint" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{t.title}</p>
                        <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                          <span>{pname(t.project_id)}</span>
                          <span className="flex items-center gap-1"><UserRound className="size-3" />{who(t.assignee)}</span>
                          {t.due_date ? <span className={cn("flex items-center gap-1", t.due_date < today && "font-medium text-bad")}><CalendarDays className="size-3" />{day(t.due_date)}</span> : null}
                        </p>
                      </div>
                      <StatusBadge status={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Nothing pending.</p>}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Member account" sub="Link their Dhow member company. On Enterprise they see this work under Our work, after signing in." />
            <form action={linkClientOrg} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={client.id} />
              <select name="org_id" defaultValue={(c as { org_id?: string | null }).org_id ?? ""} aria-label="Member company" className="field flex-1 py-2 text-sm">
                <option value="">Not linked</option>
                {(orgs ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <SubmitButton className="rounded-xl bg-navy-900 px-4 text-sm font-medium text-white">Save</SubmitButton>
              <label className="flex w-full items-center gap-2 text-sm text-muted"><input type="checkbox" name="enterprise" defaultChecked className="size-4 accent-navy-900" />Also move them to Enterprise</label>
            </form>
          </Card>
          <Card className="border-mint/40 bg-mint-100/50">
            <CardHeader title="Client page" sub="A private link where they see progress, download and pay invoices, and leave a review. No login." />
            {token ? (
              <>
                <CopyField value={`${appUrl()}/client/${token}`} share={`Hello from Dhow Partners. Follow your project, invoices and payments here:`} />
                <div className="mt-2 flex gap-4 text-xs">
                  <a href={`/client/${token}`} target="_blank" className="font-medium text-navy-600">Open it ↗</a>
                  <form action={makeClientLink}><input type="hidden" name="id" value={client.id} /><input type="hidden" name="reset" value="1" /><SubmitButton className="text-muted underline">New link (old one stops working)</SubmitButton></form>
                </div>
              </>
            ) : (
              <form action={makeClientLink}><input type="hidden" name="id" value={client.id} /><SubmitButton className="rounded-full bg-navy-900 px-4 py-2 text-sm font-medium text-white">Create client page</SubmitButton></form>
            )}
            {reviews?.length ? (
              <ul className="mt-5 space-y-2 border-t border-mint/40 pt-4">
                {reviews.map((r) => (
                  <li key={r.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2"><span className="font-medium">{r.reviewer_name}</span><span className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn("size-3.5", n <= r.rating ? "fill-amber text-amber" : "text-line")} />)}</span></div>
                    {r.comment ? <p className="mt-1 text-ink/80">{r.comment}</p> : null}
                    <p className="text-xs text-muted">{day(r.created_at)}{r.may_publish ? " · OK to share publicly" : ""}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
          <Card>
            <CardHeader title="Partners on this client" sub="Firms doing work for them, and the agreed percentage" />
            {links?.length ? (
              <ul className="mb-5 space-y-2">
                {links.map((l) => {
                  const p = l.partners as unknown as { id: string; name: string; industry: string | null; logo_url: string | null } | null;
                  return (
                    <li key={l.id} className={cn("flex items-center gap-3 rounded-2xl bg-sunken/60 p-3", l.status === "done" && "opacity-60")}>
                      <Avatar src={p?.logo_url} name={p?.name ?? "?"} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/partners/${p?.id}`} className="block truncate text-sm font-medium hover:text-navy-700">{p?.name}</Link>
                        <p className="truncate text-xs text-muted">{[l.service, l.agreed_pct != null ? `${Number(l.agreed_pct)}%` : null, l.status === "done" ? "finished" : null].filter(Boolean).join(" · ") || p?.industry}</p>
                      </div>
                      <form action={updateClientPartner} className="flex gap-1">
                        <input type="hidden" name="id" value={l.id} />
                        <SubmitButton name="action" value={l.status === "done" ? "active" : "done"} className="rounded-full px-2.5 py-1 text-xs text-navy-600 hover:bg-white">{l.status === "done" ? "Reopen" : "Done"}</SubmitButton>
                        <SubmitButton name="action" value="remove" aria-label="Remove" className="rounded-full px-2 py-1 text-xs text-muted hover:text-bad">✕</SubmitButton>
                      </form>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <ActionForm action={assignPartner} submit="Assign partner" submitVariant="outline" className="grid gap-3 rounded-2xl border border-dashed border-line p-3">
              <input type="hidden" name="client_id" value={client.id} />
              <Field label="Partner"><Select name="partner_id" required defaultValue=""><option value="" disabled>Choose a partner</option>{partners?.map((p) => <option key={p.id} value={p.id}>{p.name}{p.agreed_pct != null ? ` (${Number(p.agreed_pct)}%)` : ""}</option>)}</Select></Field>
              <div className="grid grid-cols-[1fr_6rem] gap-2">
                <Field label="For what"><Input name="service" list="partner-services" placeholder="e.g. HR 360" /></Field>
                <Field label="%" hint="Auto"><Input name="agreed_pct" type="number" min="0" max="100" step="any" placeholder="auto" /></Field>
              </div>
              <datalist id="partner-services">{[...new Set((partners ?? []).flatMap((p) => (Array.isArray(p.service_rates) ? (p.service_rates as { service: string }[]).map((r) => r.service) : [])))].map((sv) => <option key={sv} value={sv} />)}</datalist>
              <p className="text-xs text-faint">Leave % on auto to use the partner&apos;s rate for that service, or their default.</p>
            </ActionForm>
          </Card>

          <Card>
            <CardHeader title="People" action={
              <Drawer label="Contact" title="Add a contact" variant="outline">
                <ActionForm action={saveContact} submit="Add contact" className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="client_id" value={client.id} />
                  <Field label="Name"><Input name="name" required /></Field>
                  <Field label="Role"><Input name="role" /></Field>
                  <Field label="Email"><Input name="email" type="email" /></Field>
                  <Field label="Phone"><Input name="phone" /></Field>
                </ActionForm>
              </Drawer>} />
            {contacts?.length ? (
              <ul className="divide-y divide-line text-sm">
                {contacts.map((k) => <li key={k.id} className="py-2.5"><p className="font-medium">{k.name} <span className="font-normal text-muted">{k.role}</span></p><p className="text-xs text-muted">{[k.email, k.phone].filter(Boolean).join(" · ")}</p></li>)}
              </ul>
            ) : <p className="flex items-center gap-1.5 text-sm text-muted"><Plus className="size-3.5" />Add who you talk to there.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
