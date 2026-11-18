import type { Metadata } from "next";
import { Download, FileText, Trash2 } from "lucide-react";
import { isOrgAdmin, requireMember } from "@/lib/auth";
import { Card, CardHeader, Empty, Meter, PageHeader, StatusBadge, Table } from "@/components/ui";
import { ConfirmSubmit } from "@/components/forms";
import { bytes, day } from "@/lib/format";
import { DOC_KINDS, storageCapBytes } from "@/lib/types";
import { deleteDocument } from "@/actions/member";
import { Uploader } from "./uploader";

export const metadata: Metadata = { title: "Documents" };

export default async function Documents() {
  const { org, role, supabase } = await requireMember();
  const { data: docs } = await supabase
    .from("documents")
    .select("id, file_name, kind, status, size_bytes, review_note, created_at")
    .eq("org_id", org.id)
    .neq("status", "pending_upload")
    .order("created_at", { ascending: false });
  const cap = storageCapBytes(org.plan, org.verification_status);
  const canEdit = isOrgAdmin(role);

  return (
    <>
      <PageHeader title="Documents" sub="Company records, kept private to your team and Dhow reviewers." />
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Upload" sub="PDF, PNG or JPG, up to 10 MB each" />
            {canEdit ? <Uploader /> : <p className="text-sm text-muted">Ask a company admin to upload documents.</p>}
          </Card>
          <Card>
            <p className="label">Storage</p>
            <p className="num mt-2 text-2xl font-semibold">{bytes(org.storage_used_bytes)} <span className="text-base font-normal text-muted">of {bytes(cap)}</span></p>
            <div className="mt-3"><Meter value={org.storage_used_bytes} max={cap} label="Storage used" /></div>
            <p className="mt-3 text-xs text-muted">Verified companies get 500 MB. Paid plans get more.</p>
          </Card>
        </div>
        <Card>
          <CardHeader title="All documents" sub={`${docs?.length ?? 0} files`} />
          {docs?.length ? (
            <Table head={["File", "Type", "Size", "Added", "Status", ""]}>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span className="flex items-center gap-2 font-medium"><FileText className="size-4 shrink-0 text-muted" /><span className="max-w-56 truncate">{d.file_name}</span></span>
                    {d.review_note ? <span className="mt-1 block text-xs text-bad">{d.review_note}</span> : null}
                  </td>
                  <td className="text-muted">{DOC_KINDS[d.kind as keyof typeof DOC_KINDS]}</td>
                  <td className="num text-muted">{bytes(d.size_bytes)}</td>
                  <td className="text-muted">{day(d.created_at)}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <a href={`/api/documents/${d.id}/download`} className="grid size-8 place-items-center rounded-full hover:bg-sunken" aria-label={`Download ${d.file_name}`}><Download className="size-4" /></a>
                      {canEdit ? (
                        <form action={deleteDocument}>
                          <input type="hidden" name="id" value={d.id} />
                          <ConfirmSubmit variant="ghost" className="size-8 p-0" message={`Delete ${d.file_name}?`} aria-label={`Delete ${d.file_name}`}><Trash2 className="size-4" /></ConfirmSubmit>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          ) : <Empty title="No documents yet" sub="Start with your CR12 and KRA PIN certificate." />}
        </Card>
      </div>
    </>
  );
}
