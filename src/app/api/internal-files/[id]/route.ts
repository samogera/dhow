import { NextResponse } from "next/server";
import { staffOrNull } from "@/lib/auth";
import { internalDownloadUrl } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await staffOrNull();
  if (!s) return NextResponse.json({ error: "Staff only." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const { data: f } = await s.supabase.from("internal_files").select("object_path, file_name").eq("id", id).maybeSingle();
  if (!f) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const url = await internalDownloadUrl(f.object_path, f.file_name);
  return url ? NextResponse.redirect(url, 302) : NextResponse.json({ error: "Could not open the file." }, { status: 500 });
}
