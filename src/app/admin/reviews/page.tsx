import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { Card, Empty, PageHeader, StatusBadge, Table, Tabs } from "@/components/ui";
import { day } from "@/lib/format";

export const metadata: Metadata = { title: "Verification reviews" };

export default async function Reviews({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const s = await requireStaff(["reviewer"]);
  const { show } = await searchParams;
  const done = show === "decided";
  const q = s.supabase.from("verifications").select("id, tier, status, created_at, decided_at, organizations(name, brs_number)").order("created_at", { ascending: !done }).limit(100);
  const { data } = done ? await q.in("status", ["verified", "rejected"]) : await q.in("status", ["in_review", "pending", "awaiting_payment"]);
  const rows = (data ?? []) as unknown as { id: string; tier: string; status: string; created_at: string; decided_at: string | null; organizations: { name: string; brs_number: string | null } }[];

  return (
    <>
      <PageHeader title="Verification reviews" sub="Free requests and paid ones the automatic check couldn't confirm." />
      <Tabs current={done ? "/admin/reviews?show=decided" : "/admin/reviews"} items={[{ href: "/admin/reviews", label: "To review" }, { href: "/admin/reviews?show=decided", label: "Decided" }]} />
      <Card>
        {rows.length ? (
          <Table head={["Company", "BRS number", "Route", "Requested", "Status"]}>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/admin/reviews/${r.id}`} className="font-medium hover:underline">{r.organizations?.name}</Link></td>
                <td className="text-muted">{r.organizations?.brs_number ?? "—"}</td>
                <td className="text-muted">{r.tier === "instant" ? "Paid, instant" : "Free review"}</td>
                <td className="text-muted">{day(r.created_at)}</td>
                <td><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </Table>
        ) : <Empty title={done ? "No decisions yet" : "Nothing to review"} sub={done ? undefined : "New requests show up here and in your email."} />}
      </Card>
    </>
  );
}
