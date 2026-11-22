"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { partnerUpload } from "@/actions/profiles";
import { FormMessage, Submit } from "@/components/forms";
import { Field, Input, Select } from "@/components/ui";

export function UploadForm({ token, docs }: { token: string; docs: { key: string; label: string; expires: boolean }[] }) {
  const [state, act] = useActionState(partnerUpload, undefined);
  const [cat, setCat] = useState(docs[0]?.key ?? "");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  const doc = docs.find((d) => d.key === cat);
  return (
    <form ref={ref} action={act} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Which document?">
        <Select name="category" value={cat} onChange={(e) => setCat(e.target.value)}>{docs.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</Select>
      </Field>
      {doc?.expires ? <Field label="Expiry date" hint="As shown on the document"><Input name="expires_on" type="date" /></Field> : null}
      <div>
        <input type="file" name="file" required accept="application/pdf,image/png,image/jpeg"
          className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-navy-900 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white" />
        <p className="mt-1.5 text-xs text-faint">PDF, PNG or JPG, up to 10 MB.</p>
      </div>
      <FormMessage state={state} />
      <Submit className="w-full" pending="Uploading…">Upload</Submit>
    </form>
  );
}
