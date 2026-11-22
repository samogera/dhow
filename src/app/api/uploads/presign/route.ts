import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { memberOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALLOWED_MIME, MAX_FILE_BYTES, presignUpload } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import { DOC_KINDS } from "@/lib/types";
import { TIERS, tierOf } from "@/lib/plans";

const Body = z.object({
  kind: z.enum(Object.keys(DOC_KINDS) as [keyof typeof DOC_KINDS, ...(keyof typeof DOC_KINDS)[]]),
  fileName: z.string().min(1).max(200),
  mimeType: z.enum(ALLOWED_MIME),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
});

export async function POST(req: Request) {
  const m = await memberOrNull();
  if (!m) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!(await rateLimit("upload", 30))) return NextResponse.json({ error: "Too many uploads. Wait a minute." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Only PDF, PNG or JPG files up to 10 MB." }, { status: 400 });
  }
  const { kind, fileName, mimeType, size } = parsed.data;
  const db = createAdminClient();

  const tier = TIERS[tierOf(m.org)];
  const { count } = await db.from("documents").select("id", { count: "exact", head: true }).eq("org_id", m.org.id).neq("status", "rejected");
  if ((count ?? 0) >= tier.documents) {
    return NextResponse.json({ error: `Your ${tier.name} plan holds ${tier.documents} documents. Delete one or upgrade your plan.` }, { status: 413 });
  }

  const { data: ok } = await db.rpc("reserve_storage", { p_org: m.org.id, p_bytes: size });
  if (!ok) return NextResponse.json({ error: `Your ${tier.name} plan has ${Math.round(tier.storage / 1048576)} MB of space and it is full. Delete old files or upgrade your plan.` }, { status: 413 });

  const safe = fileName.replace(/[^\w.\- ]/g, "_").slice(-120);
  const key = `orgs/${m.org.id}/${randomUUID()}/${safe}`;
  const { data: doc, error } = await db
    .from("documents")
    .insert({ org_id: m.org.id, uploaded_by: m.user.id, kind, file_name: safe, object_key: key, mime_type: mimeType, size_bytes: size })
    .select("id")
    .single();
  if (error || !doc) {
    await db.rpc("release_storage", { p_org: m.org.id, p_reserved: size, p_used: 0 });
    return NextResponse.json({ error: "Could not start the upload." }, { status: 500 });
  }

  try {
    const url = await presignUpload(key, mimeType, size);
    return NextResponse.json({ documentId: doc.id, url });
  } catch (e) {
    await db.from("documents").delete().eq("id", doc.id);
    await db.rpc("release_storage", { p_org: m.org.id, p_reserved: size, p_used: 0 });
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}
