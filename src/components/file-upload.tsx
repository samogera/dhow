"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finishFileUpload, startFileUpload } from "@/actions/uploads";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input, Select } from "@/components/ui";
import { cn } from "@/lib/format";

type Doc = { key: string; label: string; expires?: boolean };
const MAX_MB = 25;

/**
 * Uploads a PDF or image straight to storage, then records it.
 * Partner link: pass token. Staff: pass ownerType (+ ownerId) and the staff fields show.
 */
export function FileUpload(props: {
  docs: Doc[];
  token?: string;
  ownerType?: "partner" | "dhow";
  ownerId?: string;
  fixedCategory?: string;
  placeholder?: string;
  submitLabel?: string;
  tone?: "solid" | "soft";
}) {
  const staff = !props.token;
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [cat, setCat] = useState(props.fixedCategory ?? props.docs[0]?.key ?? "other");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const doc = props.docs.find((d) => d.key === cat);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) return setMsg({ error: "Choose a file." });
    if (file.size > MAX_MB * 1024 * 1024) return setMsg({ error: `That file is ${(file.size / 1048576).toFixed(1)} MB. Files can be up to ${MAX_MB} MB.` });
    const expires = String(fd.get("expires_on") ?? "") || null;
    const target = staff
      ? { via: "staff" as const, owner_type: props.ownerType ?? "partner", owner_id: props.ownerId ?? null, label: String(fd.get("label") ?? ""), category: cat as never, expires_on: expires }
      : { via: "partner" as const, token: props.token!, category: cat, expires_on: expires };
    const meta = { name: file.name, mime: file.type, size: file.size };
    setMsg(null);
    try {
      setBusy("Starting…");
      const start = await startFileUpload(target, meta);
      if ("error" in start) return setMsg({ error: start.error });
      setBusy(`Uploading ${(file.size / 1048576).toFixed(1)} MB…`);
      const { error } = await createClient().storage.from("internal-files").uploadToSignedUrl(start.path, start.token, file, { contentType: file.type });
      if (error) return setMsg({ error: "The upload stopped. Check your connection and try again." });
      setBusy("Checking…");
      const done = await finishFileUpload(target, meta, start.path);
      if ("error" in done) return setMsg({ error: done.error });
      setMsg({ ok: done.ok });
      form.current?.reset();
      router.refresh();
    } catch {
      setMsg({ error: "Something interrupted the upload. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <form ref={form} onSubmit={submit} className={cn("grid gap-3", props.tone === "soft" && "rounded-3xl bg-sunken/60 p-4", staff && "sm:grid-cols-2")}>
      {staff ? <div className="sm:col-span-2"><Field label="File name"><Input name="label" required placeholder={props.placeholder ?? "Certificate of incorporation"} /></Field></div> : null}
      {props.fixedCategory ? null : (
        <div className={cn(staff ? "" : "sm:col-span-2")}>
          <Field label={staff ? "Type" : "Which document?"}>
            <Select name="category" value={cat} onChange={(e) => setCat(e.target.value)}>{props.docs.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</Select>
          </Field>
        </div>
      )}
      {staff || doc?.expires ? <Field label={staff ? "Expires" : "Expiry date"} hint={staff ? "Optional" : "As shown on the document"}><Input name="expires_on" type="date" /></Field> : null}
      <div className="sm:col-span-2">
        <input type="file" name="file" required accept="application/pdf,image/png,image/jpeg" disabled={Boolean(busy)}
          className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white" />
        <p className="mt-1 text-xs text-faint">PDF, PNG or JPG, up to {MAX_MB} MB.</p>
      </div>
      {msg ? <p role="status" className={cn("rounded-2xl px-4 py-3 text-sm sm:col-span-2", msg.error ? "bg-bad/10 text-bad" : "bg-good/10 text-good")}>{msg.error ?? msg.ok}</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={Boolean(busy)} variant={staff ? "outline" : undefined} className={cn(!staff && "w-full")}>{busy ?? props.submitLabel ?? "Upload"}</Button>
      </div>
    </form>
  );
}
