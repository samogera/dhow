import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Card, CardHeader, Empty, Field, Input, PageHeader, Select, StatusBadge, Textarea } from "@/components/ui";
import { savePartner } from "@/actions/admin";

export const metadata: Metadata = { title: "Partners" };

type P = { id: string; name: string; discipline: string | null; relationship: string; status: string; commission_terms: string | null; website: string | null; email: string | null; phone: string | null; notes: string | null };

function PartnerFields({ p }: { p?: P }) {
  return (
    <>
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <div className="sm:col-span-2"><Field label="Name"><Input name="name" required defaultValue={p?.name} /></Field></div>
      <Field label="Discipline"><Input name="discipline" placeholder="Legal, tax, HR…" defaultValue={p?.discipline ?? ""} /></Field>
      <Field label="Relationship"><Select name="relationship" defaultValue={p?.relationship ?? "service"}><option value="service">Service partner</option><option value="referral">Referral partner</option><option value="institution">Institution</option></Select></Field>
      <Field label="Status"><Select name="status" defaultValue={p?.status ?? "vetting"}>{["vetting", "approved", "paused", "rejected"].map((x) => <option key={x} value={x}>{x}</option>)}</Select></Field>
      <Field label="Commission terms"><Input name="commission_terms" placeholder="10% of fees referred" defaultValue={p?.commission_terms ?? ""} /></Field>
      <Field label="Email"><Input name="email" type="email" defaultValue={p?.email ?? ""} /></Field>
      <Field label="Phone"><Input name="phone" defaultValue={p?.phone ?? ""} /></Field>
      <div className="sm:col-span-2"><Field label="Website"><Input name="website" defaultValue={p?.website ?? ""} /></Field></div>
      <div className="sm:col-span-2"><Field label="Notes"><Textarea name="notes" rows={3} defaultValue={p?.notes ?? ""} /></Field></div>
    </>
  );
}

export default async function Partners({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const s = await requireStaff();
  const { id } = await searchParams;
  const { data: partners } = await s.supabase.from("partners").select("id, name, discipline, relationship, status, commission_terms, website, email, phone, notes").order("name");
  const selected = partners?.find((p) => p.id === id);

  return (
    <>
      <PageHeader title="Partners" sub="The firms we deliver with and the people who refer to us." />
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-3 sm:grid-cols-2">
          {partners?.length ? partners.map((p) => (
            <Link key={p.id} href={`/admin/partners?id=${p.id}`} className={`card block transition hover:-translate-y-0.5 ${p.id === id ? "ring-2 ring-forest-900" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{p.name}</p><StatusBadge status={p.status} />
              </div>
              <p className="mt-1 text-sm text-muted">{p.discipline ?? "—"} · {p.relationship}</p>
              {p.commission_terms ? <p className="mt-3 text-xs text-ink/70">{p.commission_terms}</p> : null}
            </Link>
          )) : <div className="sm:col-span-2"><Empty title="No partners yet" /></div>}
        </div>
        <Card className="self-start">
          <CardHeader title={selected ? selected.name : "Add a partner"} action={selected ? <Link href="/admin/partners" className="text-sm text-muted">Close</Link> : undefined} />
          <ActionForm key={selected?.id ?? "new"} action={savePartner} submit={selected ? "Save" : "Add partner"} className="grid gap-3 sm:grid-cols-2"><PartnerFields p={selected} /></ActionForm>
        </Card>
      </div>
    </>
  );
}
