import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { CenteredShell } from "@/components/centered-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { PARTNER_DOCS, REQUIRED_GROUPS } from "@/lib/partner-docs";
import { cn, day } from "@/lib/format";
import { FileUpload } from "@/components/file-upload";

export const metadata: Metadata = { title: "Upload documents", robots: { index: false } };

export default async function PartnerUpload({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) notFound();
  const db = createAdminClient();
  const { data: p } = await db.from("partners").select("id, name").eq("upload_token", token).maybeSingle();
  if (!p) notFound();
  const { data: files } = await db.from("internal_files").select("category, expires_on, created_at").eq("owner_type", "partner").eq("owner_id", p.id);
  const today = new Date().toISOString().slice(0, 10);
  const have = (key: string) => (files ?? []).find((f) => f.category === key && (!f.expires_on || f.expires_on >= today));
  const missing = PARTNER_DOCS.filter((d) => !have(d.key));

  return (
    <CenteredShell wide>
      <p className="label text-center">Partner documents</p>
      <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight text-navy-900">{p.name}</h1>
      <p className="mt-2 text-center text-sm text-muted">Upload your company documents here. Only the Dhow Partners team can see them.</p>

      <p className="label mt-8 mb-2">We need</p>
      <ul className="space-y-2.5 text-sm">
        {REQUIRED_GROUPS.map((g) => {
          const f = g.keys.map((k) => have(k)).find(Boolean);
          return (
            <li key={g.label} className="flex items-start gap-2.5">
              {f ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green" /> : <Circle className="mt-0.5 size-4 shrink-0 text-amber" />}
              <span className={cn("flex-1", f && "text-muted")}>{g.label}</span>
              {f ? <span className="text-xs text-green">Received {day(f.created_at)}</span> : null}
            </li>
          );
        })}
      </ul>
      <p className="label mt-6 mb-2">If you have them</p>
      <ul className="space-y-2.5 text-sm">
        {PARTNER_DOCS.filter((d) => !REQUIRED_GROUPS.some((g) => (g.keys as readonly string[]).includes(d.key))).map((d) => {
          const f = have(d.key);
          return (
            <li key={d.key} className="flex items-start gap-2.5">
              {f ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green" /> : <Circle className="mt-0.5 size-4 shrink-0 text-faint" />}
              <span className={cn("flex-1", f && "text-muted")}>{d.label}</span>
              {f ? <span className="text-xs text-green">Received {day(f.created_at)}</span> : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-8 border-t border-line pt-6">
        <FileUpload token={token} docs={(missing.length ? missing : PARTNER_DOCS).map((d) => ({ key: d.key, label: d.label, expires: "expires" in d && d.expires }))} />
      </div>
    </CenteredShell>
  );
}
