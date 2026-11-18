import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { ButtonLink, Card, Empty, PageHeader, StatusBadge, Table } from "@/components/ui";
import { day } from "@/lib/format";
import { withdrawApplication } from "@/actions/member";
import { ConfirmSubmit } from "@/components/forms";

export const metadata: Metadata = { title: "Applications" };

export default async function Applications() {
  const { org, supabase } = await requireMember();
  const { data } = await supabase
    .from("applications")
    .select("id, status, note, submitted_at, opportunities(id, title, deadline)")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false });
  const apps = (data ?? []) as unknown as { id: string; status: string; note: string | null; submitted_at: string | null; opportunities: { id: string; title: string; deadline: string | null } }[];

  return (
    <>
      <PageHeader title="Applications" sub="Every opportunity you've applied to and where it stands.">
        <ButtonLink href="/app/opportunities" variant="outline">Browse opportunities</ButtonLink>
      </PageHeader>
      <Card>
        {apps.length ? (
          <Table head={["Opportunity", "Sent", "Closes", "Status", ""]}>
            {apps.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/app/opportunities/${a.opportunities.id}`} className="font-medium hover:underline">{a.opportunities.title}</Link></td>
                <td className="text-muted">{day(a.submitted_at)}</td>
                <td className="text-muted">{day(a.opportunities.deadline)}</td>
                <td><StatusBadge status={a.status} /></td>
                <td className="text-right">
                  {a.status === "submitted" || a.status === "draft" ? (
                    <form action={withdrawApplication}>
                      <input type="hidden" name="id" value={a.id} />
                      <ConfirmSubmit variant="ghost" className="px-3 py-1.5 text-xs" message="Withdraw this application?">Withdraw</ConfirmSubmit>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </Table>
        ) : <Empty title="No applications yet" sub="Find an RFP, grant or event and apply in a few clicks." />}
      </Card>
    </>
  );
}
