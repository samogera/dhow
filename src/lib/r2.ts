import "server-only";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
  return getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType, ContentLength: size }),
    { expiresIn: 300, signableHeaders: new Set(["content-type", "content-length"]) },
  );
}

/** A 2-minute download link that saves under the original file name. */
export async function presignDownload(key: string, fileName: string) {
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

export async function headObject(key: string) {
  try {
    const r = await r2().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: r.ContentLength ?? 0, contentType: r.ContentType ?? "" };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string) {
  await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

/** First bytes of a PDF are "%PDF", a PNG starts 89 50 4E 47, a JPEG FF D8 FF. */
export async function sniffMatches(key: string, mime: string) {
  const r = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key, Range: "bytes=0-7" }));
  const b = Buffer.from(await r.Body!.transformToByteArray());
  if (mime === "application/pdf") return b.subarray(0, 4).toString() === "%PDF";
  if (mime === "image/png") return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  if (mime === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  return false;
}
