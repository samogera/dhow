import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActionForm } from "@/components/forms";
import { setStaffRole } from "@/actions/admin";
import { Badge, Card, CardHeader, Field, Input, PageHeader, Select, Table } from "@/components/ui";

export const metadata: Metadata = { title: "Team" };

const ROLES = [
  { value: "reviewer", label: "Reviewer", note: "Reviews documents and verifications, runs the CRM, wiki and marketplace." },
  { value: "finance", label: "Finance", note: "Everything a reviewer can do, plus invoices, payments and bills." },
  { value: "admin", label: "Admin", note: "Everything, plus plans and staff roles." },
] as const;

export default async function Team() {
  const s = await requireStaff();
  const isAdmin = s.staffRole === "admin";
  // Staff emails live in auth.users, which only the service role can read. This page is staff-only.
  const db = createAdminClient();
  const [{ data: staff }, { data: list }] = await Promise.all([
    db.from("profiles").select("id, full_name, staff_role").not("staff_role", "is", null).order("full_name"),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const email = (id: string) => list?.users.find((u) => u.id === id)?.email ?? "—";

  return (
    <>
      <PageHeader title="Team" sub="Who can see the Dhow workspace and what they can do." />
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <Table head={["Name", "Email", "Role"]}>
            {(staff ?? []).map((p) => (
              <tr key={p.id}>
                <td className="font-medium">{p.full_name || "—"}{p.id === s.user.id ? <span className="ml-2 text-xs text-muted">(you)</span> : null}</td>
                <td className="text-muted">{email(p.id)}</td>
                <td><Badge tone={p.staff_role === "admin" ? "mint" : "neutral"}>{p.staff_role}</Badge></td>
              </tr>
            ))}
          </Table>
          <ul className="mt-6 space-y-2 border-t border-line pt-5 text-sm">
            {ROLES.map((r) => <li key={r.value}><span className="font-medium">{r.label}.</span> <span className="text-muted">{r.note}</span></li>)}
          </ul>
        </Card>
        {isAdmin ? (
          <Card className="self-start">
            <CardHeader title="Give or change access" sub="They need a Dhow account first." />
            <ActionForm action={setStaffRole} submit="Save role">
              <Field label="Email"><Input name="email" type="email" required /></Field>
              <Field label="Role">
                <Select name="role" defaultValue="reviewer">
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
