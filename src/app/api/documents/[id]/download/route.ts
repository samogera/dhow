import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { presignDownload } from "@/lib/r2";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  // RLS: only the company's members and Dhow staff can read this row.
  const { data: doc } = await s.supabase.from("documents").select("object_key, file_name, status").eq("id", id).maybeSingle();
  if (!doc || doc.status === "pending_upload") return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.redirect(await presignDownload(doc.object_key, doc.file_name), 302);
}
