"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyStaff } from "@/lib/notify";
import { appUrl } from "@/lib/app-url";
import { z } from "zod";
import { staffOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { FILE_CATEGORY_KEYS, PARTNER_DOCS } from "@/lib/partner-docs";
import { checkInternalUpload, fileProblem, removeInternal, signInternalUpload } from "@/lib/storage";

// Two steps so big files never pass through our server: start (get a one-time upload link), then finish (check and record).

const FileMeta = z.object({ name: z.string().trim().min(1).max(200), mime: z.string().max(100), size: z.number().int().positive() });
const Staff = z.object({
  via: z.literal("staff"),
  owner_type: z.enum(["partner", "dhow"]),
  owner_id: z.string().uuid().nullable().optional(),
  label: z.string().trim().min(1, "Give the file a name").max(160),
  category: z.enum(FILE_CATEGORY_KEYS),
  expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});
const Partner = z.object({
  via: z.literal("partner"),
  token: z.string().regex(/^[A-Za-z0-9_-]{24,64}$/),
  category: z.string(),
  expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});
const Target = z.discriminatedUnion("via", [Staff, Partner]);
export type UploadTarget = z.input<typeof Target>;
type Resolved = { owner_type: "partner" | "dhow"; owner_id: string | null; label: string; category: string; expires_on: string | null; uploaded_by: string | null; uploaded_via: "staff" | "partner_link" };

async function resolve(input: unknown): Promise<Resolved | { error: string }> {
  const t = Target.safeParse(input);
  if (!t.success) return { error: t.error.issues[0]?.message ?? "Check the details and try again." };
  const v = t.data;
  if (v.via === "staff") {
    const s = await staffOrNull();
    if (!s) return { error: "You don't have permission to do that." };
    if (v.owner_type === "partner" && !v.owner_id) return { error: "Missing partner." };
    return { owner_type: v.owner_type, owner_id: v.owner_type === "partner" ? v.owner_id! : null, label: v.label, category: v.category, expires_on: v.expires_on || null, uploaded_by: s.user.id, uploaded_via: "staff" };
  }
  const { data: p } = await createAdminClient().from("partners").select("id").eq("upload_token", v.token).maybeSingle();
  if (!p) return { error: "This link has expired. Ask Dhow Partners for a new one." };
  const doc = PARTNER_DOCS.find((d) => d.key === v.category);
  if (!doc) return { error: "Choose which document this is." };
  return { owner_type: "partner", owner_id: p.id, label: doc.label, category: doc.key, expires_on: v.expires_on || null, uploaded_by: null, uploaded_via: "partner_link" };
}
const folderOf = (r: Resolved) => `${r.owner_type}/${r.owner_id ?? "dhow"}`;

export async function startFileUpload(target: UploadTarget, file: { name: string; mime: string; size: number }) {
  const r = await resolve(target);
  if ("error" in r) return r;
  const f = FileMeta.safeParse(file);
  if (!f.success) return { error: "Choose a file." };
  const problem = fileProblem(f.data.name, f.data.mime, f.data.size);
  if (problem) return { error: problem };
  if (!(await rateLimit(`upload:${r.owner_id ?? "dhow"}`, 40, 3600))) return { error: "Too many uploads. Try again in an hour." };
  const signed = await signInternalUpload(folderOf(r), f.data.name, f.data.mime);
  if ("error" in signed) return { error: signed.error as string };
  return { path: signed.path, token: signed.token };
}

export async function finishFileUpload(target: UploadTarget, file: { name: string; mime: string; size: number }, path: string) {
  const r = await resolve(target);
  if ("error" in r) return r;
  const f = FileMeta.safeParse(file);
  if (!f.success || typeof path !== "string" || !path.startsWith(`${folderOf(r)}/`) || path.includes("..")) return { error: "Upload didn't match. Try again." };
  const bad = await checkInternalUpload(path, f.data.mime, f.data.size);
  if (bad) { await removeInternal(path).catch(() => undefined); return { error: bad }; }
  const name = path.split("/").pop() ?? f.data.name;
  const { error } = await createAdminClient().from("internal_files").insert({
    owner_type: r.owner_type, owner_id: r.owner_id, label: r.label, category: r.category, expires_on: r.expires_on,
    file_name: name, object_path: path, mime_type: f.data.mime, size_bytes: f.data.size, uploaded_by: r.uploaded_by, uploaded_via: r.uploaded_via,
  });
  if (error) { await removeInternal(path).catch(() => undefined); return { error: "Could not save the file. Try again." }; }
  if (r.owner_type === "partner") revalidatePath(`/admin/partners/${r.owner_id}`); else revalidatePath("/admin/company");
  if (target.via === "partner") {
    revalidatePath(`/partner/${target.token}`);
    after(async () => {
      const { data: p } = await createAdminClient().from("partners").select("name").eq("id", r.owner_id!).maybeSingle();
      await notifyStaff(["admin"], `${p?.name ?? "A partner"} uploaded a document`, [`${p?.name ?? "A partner"} sent their ${r.label.toLowerCase()} through the upload link.`],
        { label: "See their documents", href: `${appUrl()}/admin/partners/${r.owner_id}` });
    });
  }
  return { ok: `${r.label} uploaded.` };
}
