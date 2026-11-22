import { Download, FileText, Trash2 } from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { bytes, cn, day } from "@/lib/format";
import { deleteInternalFile } from "@/actions/profiles";

import { PARTNER_DOCS, docLabel } from "@/lib/partner-docs";
import { SubmitButton } from "@/components/submit-button";
const DHOW_CATEGORIES = [["incorporation", "Certificate of incorporation"], ["cr12", "CR12"], ["kra_pin", "KRA PIN certificate"], ["tax_compliance", "Tax compliance certificate"], ["company_profile", "Company profile"], ["license", "Licence"], ["contract", "Contract"], ["other", "Other"]] as const;
type F = { id: string; label: string; category: string; file_name: string; size_bytes: number; expires_on: string | null; created_at: string; uploaded_via?: string };

/** Staff-only files for a partner or for Dhow: certificates, company profiles, registration and tax papers. */
export function InternalFiles({ files, ownerType, ownerId, fixedCategory, empty = "No files yet.", placeholder = "Certificate of incorporation" }: { files: F[]; ownerType: "partner" | "dhow"; ownerId?: string; fixedCategory?: string; empty?: string; placeholder?: string }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-5">
      {files.length ? (
        <ul className="divide-y divide-line">
          {files.map((f) => {
            const expired = f.expires_on && f.expires_on < today;
            return (
              <li key={f.id} className="flex items-center gap-3 py-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken"><FileText className="size-5 text-navy-500" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{f.label}</p>
                  <p className="truncate text-xs text-muted">
                    {docLabel(f.category)} · {bytes(f.size_bytes)}{"uploaded_via" in f && f.uploaded_via === "partner_link" ? " · sent by partner" : ""} · added {day(f.created_at)}
                    {f.expires_on ? <span className={cn(expired && "font-medium text-bad")}> · {expired ? "expired" : "expires"} {day(f.expires_on)}</span> : null}
                  </p>
                </div>
                <a href={`/api/internal-files/${f.id}`} className="grid size-9 place-items-center rounded-full hover:bg-sunken" aria-label={`Download ${f.label}`}><Download className="size-4" /></a>
                <form action={deleteInternalFile}><input type="hidden" name="id" value={f.id} />
                  <SubmitButton className="grid size-9 place-items-center rounded-full text-muted hover:bg-bad/10 hover:text-bad" aria-label={`Delete ${f.label}`}><Trash2 className="size-4" /></SubmitButton>
                </form>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-sm text-muted">{empty}</p>}
      <FileUpload tone="soft" ownerType={ownerType} ownerId={ownerId} fixedCategory={fixedCategory} placeholder={placeholder}
        docs={(ownerType === "partner" ? [...PARTNER_DOCS.map((d) => [d.key, d.label] as const), ["other", "Other"] as const] : DHOW_CATEGORIES).map(([key, label]) => ({ key, label }))} />
    </div>
  );
}
