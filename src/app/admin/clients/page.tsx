import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff, seesMoney } from "@/lib/auth";
import { ActionForm } from "@/components/forms";
import { Card, Empty, PageHeader, StatusBadge, Table } from "@/components/ui";
import { Drawer } from "@/components/drawer";
import { kes } from "@/lib/format";
import { ClientFields } from "@/components/client-fields";
import { saveClient } from "@/actions/admin";

export const metadata: Metadata = { title: "Clients" };


export default async function Clients() {
  const s = await requireStaff();
  const money = seesMoney(s.staffRole);
  const [{ data: clients }, { data: invoices }, { data: projects }] = await Promise.all([
    s.supabase.from("clients").select("id, name, sector, client_type, stage, email, country").order("name"),
    s.supabase.from("invoices").select("client_id, total_kes, paid_kes, status").neq("status", "cancelled").neq("status", "draft"),
    s.supabase.from("projects").select("client_id, status"),
  ]);
  const owed = (id: string) => (invoices ?? []).filter((i) => i.client_id === id).reduce((n, i) => n + Number(i.total_kes) - Number(i.paid_kes), 0);
  const paid = (id: string) => (invoices ?? []).filter((i) => i.client_id === id).reduce((n, i) => n + Number(i.paid_kes), 0);
  const open = (id: string) => (projects ?? []).filter((p) => p.client_id === id && p.status !== "done").length;

  return (
    <>
      <PageHeader title="Clients" sub={`${clients?.length ?? 0} clients · open one to see money, projects, tasks and partners`}>
        <Drawer label="Add client" title="Add a client" sub="Only the name is required.">
          <ActionForm action={saveClient} submit="Add client" className="grid gap-3 sm:grid-cols-2"><ClientFields /></ActionForm>
        </Drawer>
      </PageHeader>
      <Card>
        {clients?.length ? (
          <Table head={money ? ["Client", "Stage", "Open projects", "Paid to us", "Owed to us"] : ["Client", "Stage", "Open projects"]}>
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-white/70">
                <td><Link href={`/admin/clients/${c.id}`} className="font-medium hover:text-navy-700">{c.name}</Link><p className="text-xs text-muted">{[c.sector, c.client_type, c.country].filter(Boolean).join(" · ")}</p></td>
                <td><StatusBadge status={c.stage} /></td>
                <td className="num">{open(c.id) || "—"}</td>
                {money ? <td className="num text-muted">{paid(c.id) ? kes(paid(c.id)) : "—"}</td> : null}
                {money ? <td className={owed(c.id) > 0 ? "num font-semibold text-amber-700" : "num text-muted"}>{owed(c.id) > 0 ? kes(owed(c.id)) : "—"}</td> : null}
              </tr>
            ))}
          </Table>
        ) : <Empty title="No clients yet" sub="Add one, or win a lead to create one." />}
      </Card>
    </>
  );
}
