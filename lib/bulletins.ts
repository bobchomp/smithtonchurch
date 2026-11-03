import "server-only";
import { randomUUID } from "node:crypto";
import { bulletin as fallbackBulletin } from "./content";
import { ensureStorageBucket, storage, supabaseIsConfigured, withTimeout } from "./supabase";

// Weekly bulletins uploaded through the admin panel are stored in Supabase Storage as
// bulletins/<YYYY-MM-DD>-<random>.pdf, where the date is the Sunday they're for, with a picture
// of the first page alongside as bulletins/<YYYY-MM-DD>-<random>.jpg.
// Until one has been uploaded, the site uses content/bulletin.yml and the PDF in public/docs.

const FOLDER = "bulletins";

export type UploadedBulletin = {
  date: string;
  path: string;
  url: string;
  coverPath?: string;
  coverUrl?: string;
  size: number;
  uploadedAt: Date;
};
export type CurrentBulletin = { label: string; url: string; coverUrl?: string };

export function isBulletinDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

// "2026-11-08" -> "Sunday 8 November 2026"
export function formatBulletinDate(date: string): string {
  return new Date(`${date}T12:00:00Z`)
    .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .replace(",", "");
}

// Newest first. If the same Sunday was uploaded more than once, the latest upload comes first.
export async function listBulletins(): Promise<UploadedBulletin[]> {
  if (!supabaseIsConfigured()) return [];
  const { data, error } = await withTimeout(storage().list(FOLDER, { limit: 1000 }));
  if (error) {
    if (/not found/i.test(error.message)) return []; // bucket not created yet
    throw error;
  }
  const names = new Set(data.map((file) => file.name));
  return data
    .filter((file) => file.id && file.name.endsWith(".pdf") && isBulletinDate(file.name.slice(0, 10)))
    .map((file) => {
      const path = `${FOLDER}/${file.name}`;
      const coverName = file.name.replace(/\.pdf$/, ".jpg");
      const coverPath = names.has(coverName) ? `${FOLDER}/${coverName}` : undefined;
      return {
        date: file.name.slice(0, 10),
        path,
        url: storage().getPublicUrl(path).data.publicUrl,
        coverPath,
        coverUrl: coverPath && storage().getPublicUrl(coverPath).data.publicUrl,
        size: Number(file.metadata?.size ?? 0),
        uploadedAt: new Date(file.created_at ?? 0),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.uploadedAt.getTime() - a.uploadedAt.getTime());
}

export async function getCurrentBulletin(): Promise<CurrentBulletin> {
  try {
    const [latest] = await listBulletins();
    if (latest) return { label: formatBulletinDate(latest.date), url: latest.url, coverUrl: latest.coverUrl };
  } catch (error) {
    // Storage unreachable: fall back rather than break the page.
    console.error("Could not list bulletins", error);
  }
  return { label: fallbackBulletin.date, url: `/docs/bulletins/${fallbackBulletin.file}` };
}

// One-off addresses the admin's browser uploads the PDF and its cover picture to directly
// (valid for 2 hours).
export async function createBulletinUploadUrls(date: string): Promise<{ pdf: string; cover: string }> {
  await ensureStorageBucket();
  const base = `${FOLDER}/${date}-${randomUUID().slice(0, 8)}`;
  const [pdf, cover] = await Promise.all([
    storage().createSignedUploadUrl(`${base}.pdf`),
    storage().createSignedUploadUrl(`${base}.jpg`),
  ]);
  if (pdf.error) throw pdf.error;
  if (cover.error) throw cover.error;
  return { pdf: pdf.data.signedUrl, cover: cover.data.signedUrl };
}

// Deletes bulletins along with their cover pictures.
export async function deleteBulletins(bulletins: UploadedBulletin[]): Promise<void> {
  const paths = bulletins.flatMap((b) => (b.coverPath ? [b.path, b.coverPath] : [b.path]));
  if (!paths.length) return;
  const { error } = await storage().remove(paths);
  if (error) throw error;
}

// Removes older uploads for the same Sunday, so a re-upload replaces the previous file.
export async function removeReplacedBulletins(): Promise<void> {
  const seen = new Set<string>();
  const replaced = (await listBulletins()).filter((b) => (seen.has(b.date) ? true : (seen.add(b.date), false)));
  await deleteBulletins(replaced);
}
