import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Card, CardHeader, Empty, Field, Input, PageHeader, Select, StatusBadge, Table, Textarea } from "@/components/ui";
import { COUNTRIES, SECTORS } from "@/lib/types";
import { saveClient, saveContact } from "@/actions/admin";

export const metadata: Metadata = { title: "Clients" };
const STAGES = ["onboarding", "active", "on_hold", "completed", "lost"] as const;

type ClientRow = { id: string; name: string; sector: string | null; client_type: string | null; stage: string; email: string | null; phone: string | null; website: string | null; country: string | null; notes: string | null };

function ClientFields({ c }: { c?: ClientRow }) {
  return (
    <>
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <div className="sm:col-span-2"><Field label="Name"><Input name="name" required defaultValue={c?.name} /></Field></div>
      <Field label="Sector"><Select name="sector" defaultValue={c?.sector ?? ""}><option value="">—</option>{SECTORS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
      <Field label="Type"><Select name="client_type" defaultValue={c?.client_type ?? ""}><option value="">—</option>{["Foreign investor", "Local SME", "Startup", "NGO", "Government", "Individual"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
      <Field label="Email"><Input name="email" type="email" defaultValue={c?.email ?? ""} /></Field>
      <Field label="Phone"><Input name="phone" defaultValue={c?.phone ?? ""} /></Field>
      <Field label="Website"><Input name="website" defaultValue={c?.website ?? ""} /></Field>
      <Field label="Country"><Select name="country" defaultValue={c?.country ?? "Kenya"}>{COUNTRIES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
      <Field label="Stage"><Select name="stage" defaultValue={c?.stage ?? "onboarding"}>{STAGES.map((x) => <option key={x} value={x}>{x.replace("_", " ")}</option>)}</Select></Field>
      <div className="sm:col-span-2"><Field label="Notes"><Textarea name="notes" rows={3} defaultValue={c?.notes ?? ""} /></Field></div>
    </>
  );
}

export default async function Clients({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const s = await requireStaff();
  const { id } = await searchParams;
  const { data: clients } = await s.supabase.from("clients").select("id, name, sector, client_type, stage, email, phone, website, country, notes").order("name");
  const selected = clients?.find((c) => c.id === id);
  const [{ data: contacts }, { data: projects }, { data: invoices }] = selected
    ? await Promise.all([
        s.supabase.from("contacts").select("id, name, role, email, phone").eq("client_id", selected.id),
        s.supabase.from("projects").select("id, name, status").eq("client_id", selected.id),
        s.supabase.from("invoices").select("id, number, status, total_kes, paid_kes").eq("client_id", selected.id),
      ])
    : [{ data: null }, { data: null }, { data: null }];

  return (
    <>
      <PageHeader title="Clients" sub={`${clients?.length ?? 0} clients`} />
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          {clients?.length ? (
            <Table head={["Client", "Sector", "Type", "Stage"]}>
              {clients.map((c) => (
                <tr key={c.id} className={c.id === id ? "bg-sunken" : "hover:bg-sunken/60"}>
                  <td><Link href={`/admin/clients?id=${c.id}`} className="font-medium hover:underline">{c.name}</Link><p className="text-xs text-muted">{c.email}</p></td>
                  <td className="text-muted">{c.sector ?? "—"}</td>
                  <td className="text-muted">{c.client_type ?? "—"}</td>
                  <td><StatusBadge status={c.stage} /></td>
                </tr>
              ))}
            </Table>
          ) : <Empty title="No clients yet" sub="Add one here, or win a lead to create one." />}
        </Card>

        {selected ? (
          <div className="space-y-4">
            <Card>
              <CardHeader title={selected.name} action={<Link href="/admin/clients" className="text-sm text-muted">Close</Link>} />
              <ActionForm key={selected.id} action={saveClient} className="grid gap-3 sm:grid-cols-2"><ClientFields c={selected} /></ActionForm>
            </Card>
            <Card>
              <CardHeader title="Work and money" action={<Link href={`/admin/finance/invoices/new?client=${selected.id}`} className="text-sm text-navy-600 underline">New invoice</Link>} />
              <ul className="space-y-2 text-sm">
                {projects?.map((p) => <li key={p.id} className="flex justify-between"><span>{p.name}</span><StatusBadge status={p.status} /></li>)}
                {invoices?.map((i) => <li key={i.id} className="flex justify-between"><Link href={`/admin/finance/invoices/${i.id}`} className="hover:underline">Invoice #{i.number}</Link><StatusBadge status={i.status} /></li>)}
                {!projects?.length && !invoices?.length ? <li className="text-muted">No projects or invoices yet.</li> : null}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Contacts" />
              <ul className="mb-4 divide-y divide-line text-sm">
                {contacts?.map((k) => <li key={k.id} className="py-2"><p className="font-medium">{k.name} <span className="font-normal text-muted">{k.role}</span></p><p className="text-xs text-muted">{[k.email, k.phone].filter(Boolean).join(" · ")}</p></li>)}
              </ul>
              <ActionForm key={"c" + selected.id} action={saveContact} submit="Add contact" submitVariant="outline" className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="client_id" value={selected.id} />
                <Field label="Name"><Input name="name" required /></Field>
                <Field label="Role"><Input name="role" /></Field>
                <Field label="Email"><Input name="email" type="email" /></Field>
                <Field label="Phone"><Input name="phone" /></Field>
              </ActionForm>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader title="Add a client" />
            <ActionForm action={saveClient} submit="Add client" className="grid gap-3 sm:grid-cols-2"><ClientFields /></ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
