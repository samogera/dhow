import "server-only";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createAdminClient } from "@/lib/supabase/admin";

// Member documents go to Cloudflare R2 when it is configured, otherwise to the private
// Supabase Storage bucket "member-documents". Same functions either way.
const r2Configured = () => !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
const SB_BUCKET = "member-documents";
const sb = () => createAdminClient().storage.from(SB_BUCKET);

export const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg"] as const;
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file

let client: S3Client | null = null;
function r2() {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error("Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.");
  }
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });
  return client;
}
const bucket = () => process.env.R2_BUCKET ?? "dhow-os-documents";

/** A 5-minute upload link locked to one key, one content type and one exact size. */
export async function presignUpload(key: string, contentType: string, size: number) {
  if (!r2Configured()) {
    const { data, error } = await sb().createSignedUploadUrl(key);
    if (error || !data) throw new Error("Could not start the upload. Try again.");
    return data.signedUrl;
  }
  return getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType, ContentLength: size }),
    { expiresIn: 300, signableHeaders: new Set(["content-type", "content-length"]) },
  );
}

/** A 2-minute download link that saves under the original file name. */
export async function presignDownload(key: string, fileName: string) {
  if (!r2Configured()) {
    const { data } = await sb().createSignedUrl(key, 120, { download: fileName.replace(/[^\w.\- ]/g, "_") });
    if (!data?.signedUrl) throw new Error("Could not open that file.");
    return data.signedUrl;
  }
  return getSignedUrl(
    r2(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: `attachment; filename="${fileName.replace(/[^\w.\- ]/g, "_")}"`,
    }),
    { expiresIn: 120 },
  );
}

async function sbRange(key: string, bytes: string) {
  const { data } = await sb().createSignedUrl(key, 60);
  if (!data?.signedUrl) return null;
  const res = await fetch(data.signedUrl, { headers: { Range: `bytes=${bytes}` }, cache: "no-store" }).catch(() => null);
  return res && res.ok ? res : null;
}

export async function headObject(key: string) {
  if (!r2Configured()) {
    const res = await sbRange(key, "0-0");
    if (!res) return null;
    const size = Number(res.headers.get("content-range")?.split("/")[1] ?? res.headers.get("content-length") ?? 0);
    return { size, contentType: (res.headers.get("content-type") ?? "").split(";")[0] };
  }
  try {
    const r = await r2().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: r.ContentLength ?? 0, contentType: r.ContentType ?? "" };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string) {
  if (!r2Configured()) {
    await sb().remove([key]);
    return;
  }
  await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

/** First bytes of a PDF are "%PDF", a PNG starts 89 50 4E 47, a JPEG FF D8 FF. */
export async function sniffMatches(key: string, mime: string) {
  let b: Buffer;
  if (!r2Configured()) {
    const res = await sbRange(key, "0-7");
    if (!res) return false;
    b = Buffer.from(new Uint8Array(await res.arrayBuffer()).slice(0, 8));
  } else {
    const r = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key, Range: "bytes=0-7" }));
    b = Buffer.from(await r.Body!.transformToByteArray());
  }
  if (mime === "application/pdf") return b.subarray(0, 4).toString() === "%PDF";
  if (mime === "image/png") return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  if (mime === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  return false;
}
