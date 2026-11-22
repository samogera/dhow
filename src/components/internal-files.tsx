import { Download, FileText, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/forms";
import { Field, Input, Select } from "@/components/ui";
import { bytes, cn, day } from "@/lib/format";
import { deleteInternalFile, uploadInternalFile } from "@/actions/profiles";

import { PARTNER_DOCS, docLabel } from "@/lib/partner-docs";
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
                  <button className="grid size-9 place-items-center rounded-full text-muted hover:bg-bad/10 hover:text-bad" aria-label={`Delete ${f.label}`}><Trash2 className="size-4" /></button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-sm text-muted">{empty}</p>}
      <ActionForm action={uploadInternalFile} submit="Upload" submitVariant="outline" className="grid gap-3 rounded-3xl bg-sunken/60 p-4 sm:grid-cols-2">
        <input type="hidden" name="owner_type" value={ownerType} />
        {ownerId ? <input type="hidden" name="owner_id" value={ownerId} /> : null}
        <div className="sm:col-span-2"><Field label="File name"><Input name="label" required placeholder={placeholder} /></Field></div>
        {fixedCategory ? <input type="hidden" name="category" value={fixedCategory} /> : <Field label="Type"><Select name="category" defaultValue={ownerType === "partner" ? "incorporation" : "incorporation"}>{(ownerType === "partner" ? [...PARTNER_DOCS.map((d) => [d.key, d.label] as const), ["other", "Other"] as const] : DHOW_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>}
        <Field label="Expires" hint="Optional"><Input name="expires_on" type="date" /></Field>
        <div className="sm:col-span-2">
          <input type="file" name="file" required accept="application/pdf,image/png,image/jpeg"
            className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white" />
          <p className="mt-1 text-xs text-faint">PDF, PNG or JPG, up to 10 MB.</p>
        </div>
      </ActionForm>
    </div>
  );
}
