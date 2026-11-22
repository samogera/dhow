import type { Metadata } from "next";
import { STAFF_ROLE_LABEL, type StaffRole } from "@/lib/types";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActionForm } from "@/components/forms";
import { setStaffRole } from "@/actions/admin";
import { deletePerson, savePerson } from "@/actions/profiles";
import { Badge, Card, CardHeader, Empty, Field, Input, PageHeader, Select, Table, Textarea } from "@/components/ui";
import { Drawer } from "@/components/drawer";
import { Avatar, ImageInput } from "@/components/profile-bits";
import { Mail, Phone } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";

type Person = { id: string; full_name: string; title: string | null; department: string | null; email: string | null; phone: string | null; photo_url: string | null; bio: string | null; linkedin: string | null; started_on: string | null; active: boolean };

function PersonFields({ p }: { p?: Person }) {
  return (
    <>
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <div className="sm:col-span-2"><ImageInput current={p?.photo_url} name={p?.full_name ?? "New person"} label="Photo" round /></div>
      <div className="sm:col-span-2"><Field label="Full name"><Input name="full_name" required defaultValue={p?.full_name} /></Field></div>
      <Field label="Job title"><Input name="title" placeholder="Business Development Lead" defaultValue={p?.title ?? ""} /></Field>
      <Field label="Team"><Input name="department" placeholder="Advisory, Operations…" defaultValue={p?.department ?? ""} /></Field>
      <Field label="Email"><Input name="email" type="email" defaultValue={p?.email ?? ""} /></Field>
      <Field label="Phone"><Input name="phone" defaultValue={p?.phone ?? ""} /></Field>
      <Field label="LinkedIn"><Input name="linkedin" defaultValue={p?.linkedin ?? ""} placeholder="linkedin.com/in/…" /></Field>
      <Field label="Started"><Input name="started_on" type="date" defaultValue={p?.started_on ?? ""} /></Field>
      <div className="sm:col-span-2"><Field label="Short bio"><Textarea name="bio" rows={3} maxLength={1500} defaultValue={p?.bio ?? ""} /></Field></div>
      {p ? <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="active" defaultChecked={p.active} className="accent-navy-900" />Currently on the team</label> : null}
    </>
  );
}

export const metadata: Metadata = { title: "Team" };

const ROLES = [
  { value: "employee", label: "Employee", note: "Adds and updates clients, leads, projects and tasks. Can't delete, change the Dhow profile or see money. Finished tasks go to someone else to check." },
  { value: "reviewer", label: "Reviewer", note: "Reviews documents and verifications, runs clients, leads, partners and projects." },
  { value: "finance", label: "Finance", note: "Everything a reviewer can do, plus invoices, payments and bills." },
  { value: "admin", label: "Director / owner", note: "Everything: deleting, the Dhow profile, money, plans and staff roles." },
] as const;

export default async function Team() {
  const s = await requireStaff();
  const isAdmin = s.staffRole === "admin";
  // Staff emails live in auth.users, which only the service role can read. This page is staff-only.
  const db = createAdminClient();
  const [{ data: staff }, { data: list }, { data: invites }, { data: peopleRows }] = await Promise.all([
    db.from("profiles").select("id, full_name, staff_role").not("staff_role", "is", null).order("full_name"),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    db.from("staff_invites").select("email, role, created_at").order("created_at"),
    s.supabase.from("team_people").select("*").order("active", { ascending: false }).order("sort").order("full_name"),
  ]);
  const email = (id: string) => list?.users.find((u) => u.id === id)?.email ?? "—";
  const people = (peopleRows ?? []) as Person[];
  const staffEmails = new Set((staff ?? []).map((p) => email(p.id).toLowerCase()));

  return (
    <>
      <PageHeader title="Team" sub="Everyone at Dhow, and who can sign in to the workspace.">
        <Drawer label="Add person" title="Add someone to the team" sub="They don't need a login. Give access below only if they'll use the system.">
          <ActionForm action={savePerson} submit="Add to team" className="grid gap-3 sm:grid-cols-2"><PersonFields /></ActionForm>
        </Drawer>
      </PageHeader>

      <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">The team</h2>
      {people.length ? (
        <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((p) => (
            <article key={p.id} className={`card flex flex-col gap-4 ${p.active ? "" : "opacity-60"}`}>
              <div className="flex items-start gap-3">
                <Avatar src={p.photo_url} name={p.full_name} size="lg" round />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900">{p.full_name}</p>
                  <p className="text-sm text-muted">{[p.title, p.department].filter(Boolean).join(" · ") || "—"}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.email && staffEmails.has(p.email.toLowerCase()) ? <Badge tone="mint">Has system access</Badge> : <Badge>No login</Badge>}
                    {!p.active ? <Badge tone="warn">Former</Badge> : null}
                  </div>
                </div>
              </div>
              {p.bio ? <p className="line-clamp-3 text-sm text-ink/80">{p.bio}</p> : null}
              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {p.email ? <a href={`mailto:${p.email}`} className="flex items-center gap-1 text-navy-600"><Mail className="size-3.5" />{p.email}</a> : null}
                {p.phone ? <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-navy-600"><Phone className="size-3.5" />{p.phone}</a> : null}
                {p.linkedin ? <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="text-navy-600">LinkedIn ↗</a> : null}
              </div>
              <div className="flex items-center gap-2 border-t border-line pt-3">
                <Drawer label="Edit" title={`Edit ${p.full_name}`} variant="outline" plus={false}>
                  <ActionForm action={savePerson} submit="Save" className="grid gap-3 sm:grid-cols-2"><PersonFields p={p} /></ActionForm>
                </Drawer>
                <form action={deletePerson} className="ml-auto"><input type="hidden" name="id" value={p.id} /><SubmitButton className="rounded-full px-3 py-2 text-xs text-muted hover:bg-bad/10 hover:text-bad">Remove</SubmitButton></form>
              </div>
            </article>
          ))}
        </div>
      ) : <div className="mb-10"><Empty title="No one added yet" sub="Add everyone on the team, with or without a login." /></div>}

      <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Workspace access</h2>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <Table head={["Name", "Email", "Role"]}>
            {(staff ?? []).map((p) => (
              <tr key={p.id}>
                <td className="font-medium">{p.full_name || "—"}{p.id === s.user.id ? <span className="ml-2 text-xs text-muted">(you)</span> : null}</td>
                <td className="text-muted">{email(p.id)}</td>
                <td><Badge tone={p.staff_role === "admin" ? "mint" : "neutral"}>{STAFF_ROLE_LABEL[p.staff_role as StaffRole] ?? p.staff_role}</Badge></td>
              </tr>
            ))}
            {(invites ?? []).map((i) => (
              <tr key={i.email}>
                <td className="text-muted">Invited</td>
                <td className="text-muted">{i.email}</td>
                <td><Badge tone="warn">{i.role} · waiting for sign-up</Badge></td>
              </tr>
            ))}
          </Table>
          <ul className="mt-6 space-y-2 border-t border-line pt-5 text-sm">
            {ROLES.map((r) => <li key={r.value}><span className="font-medium">{r.label}.</span> <span className="text-muted">{r.note}</span></li>)}
          </ul>
        </Card>
        {isAdmin ? (
          <Card className="self-start">
            <CardHeader title="Give or change access" sub="Works before they sign up too: the role applies when they create their account." />
            <ActionForm action={setStaffRole} submit="Save role">
              <Field label="Email"><Input name="email" type="email" required /></Field>
              <Field label="Role">
                <Select name="role" defaultValue="employee">
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  <option value="none">Remove staff access</option>
                </Select>
              </Field>
            </ActionForm>
          </Card>
        ) : null}
      </div>
    </>
  );
}
