import "server-only";
import { randomUUID } from "node:crypto";
import { currentNotice, type LiveNotice, type PublicLiveNotice, noticeTitleSize } from "./live-notice-types";
import { db, selectAll, upsertRows } from "./db";
import { ensureStorageBucket, storage, supabaseIsConfigured, withTimeout } from "./supabase";

// Notices are kept in the database's "live_notices" table, one row each (lib/db.ts), so ones that
// haven't started yet can't be read early. Their images go in the public "website" bucket under
// live-notices/, with random names.

export const NOTICE_IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const toRow = (n: LiveNotice) => ({ id: n.id, data: n, updated_at: new Date().toISOString() });

// Every notice. Throws if they can't be read (so a failed read is never saved over them).
export async function loadNotices(): Promise<LiveNotice[]> {
  if (!supabaseIsConfigured()) return [];
  const rows = await selectAll<{ data: LiveNotice }>((from, to) => db().from("live_notices").select("data").order("id").range(from, to));
  return rows.map((r) => r.data);
}

// Saves one notice (new or changed).
export async function storeNotice(notice: LiveNotice): Promise<void> {
  return upsertRows("live_notices", [toRow(notice)], "id");
}

export async function removeNotice(id: string): Promise<void> {
  const { error } = await withTimeout(db().from("live_notices").delete().eq("id", id));
  if (error) throw error;
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
      style: notice.style === "warning" ? "warning" : "info",
      titleSize: noticeTitleSize(notice.titleSize),
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
