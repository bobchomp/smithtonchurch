import "server-only";
import { randomUUID } from "node:crypto";
import { currentNotice, type LiveNotice, type PublicLiveNotice } from "./live-notice-types";
import { ensurePrivateBucket, readPrivateJson, writePrivateJson } from "./private-store";
import { ensureStorageBucket, storage, supabaseIsConfigured } from "./supabase";

// The list of notices is kept in the private bucket, so notices that haven't started yet can't be
// read early. Their images go in the public "website" bucket under live-notices/, with random names.

const INDEX_PATH = "live-notices/index.json";
export const NOTICE_IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function loadNotices(): Promise<LiveNotice[]> {
  if (!supabaseIsConfigured()) return [];
  return (await readPrivateJson<LiveNotice[]>(INDEX_PATH)) ?? [];
}

export async function saveNotices(notices: LiveNotice[]): Promise<void> {
  await ensurePrivateBucket();
  await writePrivateJson(INDEX_PATH, notices);
}

export function noticeImageUrl(path: string): string {
  return storage().getPublicUrl(path).data.publicUrl;
}

export function isNoticeImagePath(path: string): boolean {
  return /^live-notices\/[\w-]+\.(jpg|png|webp)$/.test(path);
}

// A one-off address for the admin's browser to upload a notice's image to.
export async function createNoticeImageUpload(contentType: string): Promise<{ url: string; path: string }> {
  const ext = NOTICE_IMAGE_TYPES[contentType];
  if (!ext) throw new Error("The image needs to be a JPG, PNG or WebP.");
  await ensureStorageBucket();
  const path = `live-notices/${randomUUID()}.${ext}`;
  const { data, error } = await storage().createSignedUploadUrl(path);
  if (error) throw error;
  return { url: data.signedUrl, path };
}

export async function deleteNoticeImages(paths: string[]): Promise<void> {
  const valid = paths.filter(isNoticeImagePath);
  if (!valid.length) return;
  const { error } = await storage().remove(valid);
  if (error) console.error("Could not delete notice images", error);
}

// The notice to show on the live page right now, if any. Never throws.
export async function getCurrentPublicNotice(): Promise<PublicLiveNotice | null> {
  try {
    const notice = currentNotice(await loadNotices());
    if (!notice) return null;
    return {
      heading: notice.heading,
      text: notice.text,
      ...(notice.image ? { imageUrl: noticeImageUrl(notice.image.path), imageAlt: notice.image.alt } : {}),
      ...(notice.link ? { link: notice.link } : {}),
    };
  } catch (error) {
    console.error("Could not load live notices", error);
    return null;
  }
}
