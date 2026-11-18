import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { Badge, Button, Card, CardHeader, StatusBadge, Table } from "@/components/ui";
import { bytes, day, label } from "@/lib/format";
import { DOC_KINDS } from "@/lib/types";
import { reviewDocument } from "@/actions/admin";
import { DecisionForm } from "./decision";

export default async function ReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireStaff(["reviewer"]);
  const { data: v } = await s.supabase.from("verifications").select("*, organizations(*)").eq("id", id).maybeSingle();
  if (!v) notFound();
  const org = v.organizations as Record<string, any>;
  const [{ data: docs }, { data: pays }] = await Promise.all([
    s.supabase.from("documents").select("id, file_name, kind, status, size_bytes, created_at, review_note").eq("org_id", org.id).neq("status", "pending_upload").order("created_at", { ascending: false }),
    s.supabase.from("payments").select("amount_kes, status, mpesa_receipt, paid_at").eq("reference_id", v.id),
  ]);
  const open = ["in_review", "pending"].includes(v.status);
  const result = v.result as { reason?: string; details?: Record<string, unknown> } | null;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/reviews" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> All reviews</Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{org.name}</h1>
        <StatusBadge status={v.status} />
        <Badge tone={v.tier === "instant" ? "lime" : "neutral"}>{v.tier === "instant" ? "Paid, instant" : "Free review"}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Company details" sub="As entered by the member" />
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="label">BRS number</dt><dd className="mt-1 font-medium">{org.brs_number ?? "—"}</dd></div>
              <div><dt className="label">KRA PIN</dt><dd className="mt-1 font-medium">{org.kra_pin_last4 ? `ends ${org.kra_pin_last4}` : "—"}</dd></div>
              <div><dt className="label">Country</dt><dd className="mt-1">{org.country}</dd></div>
              <div><dt className="label">Sector</dt><dd className="mt-1">{org.sector ?? "—"}</dd></div>
              <div><dt className="label">Joined</dt><dd className="mt-1">{day(org.created_at)}</dd></div>
              <div><dt className="label">Website</dt><dd className="mt-1 truncate">{org.website ? <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-forest-600 underline">{org.website.replace(/^https?:\/\//, "")}</a> : "—"}</dd></div>
            </dl>
          </Card>
          {result?.reason ? (
            <Card>
              <CardHeader title="Automatic check" sub={v.provider ? label(v.provider) : undefined} />
              <p className="text-sm">{result.reason}</p>
              {result.details ? <pre className="mt-3 max-h-48 overflow-auto rounded-2xl bg-sunken p-3 text-xs">{JSON.stringify(result.details, null, 2)}</pre> : null}
            </Card>
          ) : null}
          {pays?.length ? (
            <Card>
              <CardHeader title="Payment" />
              {pays.map((p, i) => <p key={i} className="text-sm">KSh {p.amount_kes} · <StatusBadge status={p.status} /> {p.mpesa_receipt ? `· ${p.mpesa_receipt}` : ""}</p>)}
            </Card>
          ) : null}
          {open ? (
            <Card>
              <CardHeader title="Decision" sub="Check BRS records on eCitizen before approving" />
              <DecisionForm id={v.id} />
            </Card>
          ) : (
            <Card><p className="text-sm">Decided {day(v.decided_at)}{v.review_note ? `: ${v.review_note}` : "."}</p></Card>
          )}
        </div>

        <Card>
          <CardHeader title="Documents" sub={`${docs?.length ?? 0} files`} />
          <Table head={["File", "Type", "Status", ""]}>
            {(docs ?? []).map((d) => (
              <tr key={d.id}>
                <td>
                  <a href={`/api/documents/${d.id}/download`} className="flex items-center gap-2 font-medium hover:underline"><Download className="size-4 text-muted" /><span className="max-w-48 truncate">{d.file_name}</span></a>
                  <span className="text-xs text-muted">{bytes(d.size_bytes)} · {day(d.created_at)}</span>
                </td>
                <td className="text-muted">{DOC_KINDS[d.kind as keyof typeof DOC_KINDS]}</td>
                <td><StatusBadge status={d.status} /></td>
                <td>
                  <div className="flex justify-end gap-1">
                    {(["approved", "rejected"] as const).map((st) => (
                      <form key={st} action={reviewDocument}>
                        <input type="hidden" name="id" value={d.id} /><input type="hidden" name="status" value={st} /><input type="hidden" name="back" value={`/admin/reviews/${v.id}`} />
                        <Button variant={st === "approved" ? "outline" : "danger"} className="px-3 py-1.5 text-xs">{st === "approved" ? "OK" : "Reject"}</Button>
                      </form>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  );
}
