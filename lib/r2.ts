import "server-only";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Sermon audio is stored in Cloudflare R2 (cheap for large files, no charge when people listen).
//
// Environment variables (set in Vercel):
//   R2_ACCOUNT_ID         Cloudflare account ID
//   R2_ACCESS_KEY_ID      R2 API token's access key ID
//   R2_SECRET_ACCESS_KEY  R2 API token's secret access key
//   R2_BUCKET             bucket name, e.g. smithton-sermons
//   R2_PUBLIC_URL         the bucket's public address, e.g. https://media.smithtonchurch.com
//   R2_ENDPOINT           optional; only for testing against something other than Cloudflare

function settings() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  return {
    endpoint: process.env.R2_ENDPOINT?.trim() || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined),
    accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim(),
    bucket: process.env.R2_BUCKET?.trim(),
    publicUrl: process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, ""),
  };
}

export function r2IsConfigured(): boolean {
  const s = settings();
  return Boolean(s.endpoint && s.accessKeyId && s.secretAccessKey && s.bucket && s.publicUrl);
}

let client: S3Client | undefined;

function r2(): { client: S3Client; bucket: string } {
  const s = settings();
  if (!r2IsConfigured()) throw new Error("Audio storage (Cloudflare R2) isn’t set up yet.");
  client ??= new S3Client({
    region: "auto",
    endpoint: s.endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: s.accessKeyId!, secretAccessKey: s.secretAccessKey! },
  });
  return { client, bucket: s.bucket! };
}

// The public web address of a stored audio file.
export function audioUrl(key: string | undefined): string | undefined {
  const base = settings().publicUrl;
  if (!key || !base) return undefined;
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

// A one-off address the admin's browser uploads an MP3 to directly (valid for 2 hours), and the
// headers the browser must send with it. The file is marked to download under a friendly name,
// which doesn't stop it playing on the page.
export async function createAudioUploadUrl(
  key: string,
  downloadName: string,
): Promise<{ url: string; headers: Record<string, string> }> {
  const { client, bucket } = r2();
  const headers = { "content-type": "audio/mpeg", "content-disposition": contentDisposition(downloadName) };
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: headers["content-type"],
    ContentDisposition: headers["content-disposition"],
  });
  const url = await getSignedUrl(client, command, {
    expiresIn: 2 * 60 * 60,
    signableHeaders: new Set(Object.keys(headers)),
  });
  return { url, headers };
}

export async function deleteAudio(key: string): Promise<void> {
  const { client, bucket } = r2();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "") || "sermon.mp3";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
