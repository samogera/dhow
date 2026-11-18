import { NextResponse } from "next/server";
import { z } from "zod";
import { memberOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteObject, headObject, sniffMatches } from "@/lib/r2";

const Body = z.object({ documentId: z.string().uuid() });

export async function POST(req: Request) {
  const m = await memberOrNull();
  if (!m) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const db = createAdminClient();
  const { data: doc } = await db
    .from("documents")
    .select("id, org_id, object_key, mime_type, size_bytes, status")
    .eq("id", parsed.data.documentId)
    .single();
  if (!doc || doc.org_id !== m.org.id) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (doc.status !== "pending_upload") return NextResponse.json({ ok: true });

  const reject = async (msg: string) => {
    await deleteObject(doc.object_key).catch(() => undefined);
    await db.rpc("release_storage", { p_org: doc.org_id, p_reserved: doc.size_bytes, p_used: 0 });
    await db.from("documents").delete().eq("id", doc.id);
    return NextResponse.json({ error: msg }, { status: 400 });
  };

  const head = await headObject(doc.object_key);
  if (!head) return reject("The upload didn't arrive. Try again.");
  if (head.size !== doc.size_bytes) return reject("The file size changed during upload. Try again.");
  if (!(await sniffMatches(doc.object_key, doc.mime_type))) return reject("That file isn't a real PDF, PNG or JPG.");

  await db.from("documents").update({ status: "uploaded" }).eq("id", doc.id);
  await db.rpc("commit_storage", { p_org: doc.org_id, p_reserved: doc.size_bytes, p_actual: head.size });
  return NextResponse.json({ ok: true });
}
