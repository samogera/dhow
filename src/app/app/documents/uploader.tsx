"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Button, Field, Select } from "@/components/ui";
import { DOC_KINDS } from "@/lib/types";

const MAX = 10 * 1024 * 1024;
const TYPES = ["application/pdf", "image/png", "image/jpeg"];

export function Uploader() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState("cr12");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});

  function pick(f: File | undefined) {
    setMsg({});
    if (!f) return;
    if (!TYPES.includes(f.type)) return setMsg({ error: "Only PDF, PNG or JPG files." });
    if (f.size > MAX) return setMsg({ error: "That file is over 10 MB." });
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMsg({});
    try {
      const r = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, fileName: file.name, mimeType: file.type, size: file.size }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      // Straight to Cloudflare R2 with the short-lived link.
      const put = await fetch(j.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("Upload failed. Check your connection and try again.");
      const done = await fetch("/api/uploads/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: j.documentId }),
      });
      const dj = await done.json();
      if (!done.ok) throw new Error(dj.error);
      setFile(null);
      if (input.current) input.current.value = "";
      setMsg({ ok: "Uploaded." });
      router.refresh();
    } catch (e) {
      setMsg({ error: (e as Error).message || "Upload failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Document type">
        <Select value={kind} onChange={(e) => setKind(e.target.value)}>
          {Object.entries(DOC_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-line bg-sunken px-4 py-8 text-center transition hover:border-navy-300"
      >
        <UploadCloud className="size-6 text-navy-500" />
        <span className="text-sm font-medium">{file ? file.name : "Drop a file or click to choose"}</span>
        <span className="text-xs text-muted">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "PDF, PNG, JPG"}</span>
        <input ref={input} type="file" accept=".pdf,.png,.jpg,.jpeg" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {msg.error ? <p className="rounded-2xl bg-bad/10 px-4 py-3 text-sm text-bad">{msg.error}</p> : null}
      {msg.ok ? <p className="rounded-2xl bg-good/10 px-4 py-3 text-sm text-good">{msg.ok}</p> : null}
      <Button onClick={upload} disabled={!file || busy} className="w-full">{busy ? "Uploading…" : "Upload"}</Button>
    </div>
  );
}
