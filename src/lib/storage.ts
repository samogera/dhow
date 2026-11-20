import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Supabase Storage. Two buckets:
//   public-images   logos and photos (public links, so they can show anywhere)
//   internal-files  certificates, company profiles, contracts (private; staff get 2-minute links)

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const FILE_TYPES: Record<string, string> = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg" };

/** Checks the first bytes, so a renamed file can't pretend to be a PDF or image. */
function sniff(b: Uint8Array, mime: string) {
  if (mime === "application/pdf") return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
  if (mime === "image/png") return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  if (mime === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === "image/webp") return b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45;
  return false;
}

export const isFile = (v: FormDataEntryValue | null): v is File => typeof v === "object" && v !== null && "size" in v && (v as File).size > 0;

export async function uploadImage(file: File, folder: string): Promise<{ url: string } | { error: string }> {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { error: "Use a PNG, JPG or WebP image." };
  if (file.size > 3 * 1024 * 1024) return { error: "Images can be up to 3 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniff(bytes, file.type)) return { error: "That file doesn't look like an image." };
  const db = createAdminClient();
  const path = `${folder}/${randomUUID()}.${ext}`;
  const { error } = await db.storage.from("public-images").upload(path, bytes, { contentType: file.type, cacheControl: "31536000" });
  if (error) return { error: `Upload failed: ${error.message}` };
  return { url: db.storage.from("public-images").getPublicUrl(path).data.publicUrl };
}

export async function uploadInternal(file: File, folder: string): Promise<{ path: string; mime: string; size: number; name: string } | { error: string }> {
  const ext = FILE_TYPES[file.type];
  if (!ext) return { error: "Use a PDF, PNG or JPG file." };
  if (file.size > 10 * 1024 * 1024) return { error: "Files can be up to 10 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniff(bytes, file.type)) return { error: "That file doesn't match its type." };
  const name = file.name.replace(/[^\w.\- ]/g, "_").slice(-120) || `file.${ext}`;
  const path = `${folder}/${randomUUID()}/${name}`;
  const { error } = await createAdminClient().storage.from("internal-files").upload(path, bytes, { contentType: file.type });
  if (error) return { error: `Upload failed: ${error.message}` };
  return { path, mime: file.type, size: file.size, name };
}

export async function internalDownloadUrl(path: string, name: string) {
  const { data } = await createAdminClient().storage.from("internal-files").createSignedUrl(path, 120, { download: name });
  return data?.signedUrl ?? null;
}

export async function removeInternal(path: string) {
  await createAdminClient().storage.from("internal-files").remove([path]);
}
