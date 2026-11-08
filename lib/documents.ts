import "server-only";
import { randomUUID } from "node:crypto";
import { bulletin as fallbackBulletin } from "./content";
import { DOCUMENT_TYPES, bulletinSunday, formatDocumentDate, type DocumentKind, type PublicDocument } from "./document-types";
import { ensureStorageBucket, storage, supabaseIsConfigured, withTimeout } from "./supabase";

// Documents uploaded through the admin panel are stored in Supabase Storage as
// <folder>/<date>-<random>.pdf, where the date is the Sunday or month they're for, with a picture
// of the first page alongside as <folder>/<date>-<random>.jpg.

export type UploadedDocument = {
  date: string;
  path: string;
  url: string;
  coverPath?: string;
  coverUrl?: string;
  size: number;
  uploadedAt: Date;
};

// Shown until the first upload: the copies that were moved over from the old website.
const FALLBACKS: Record<DocumentKind, PublicDocument> = {
  bulletin: { date: "", label: fallbackBulletin.date, url: `/docs/bulletins/${fallbackBulletin.file}` },
  newsletter: {
    date: "2026-07",
    label: "July 2026",
    url: "/docs/missions/marsalis-newsletter-july-2026.pdf",
    coverUrl: "/images/marsalis-newsletter-july-2026.jpg",
  },
};

function fileDate(kind: DocumentKind, name: string): string | undefined {
  const pattern = DOCUMENT_TYPES[kind].precision === "day" ? /^(\d{4}-\d{2}-\d{2})-\w+\.pdf$/ : /^(\d{4}-\d{2})-\w+\.pdf$/;
  return name.match(pattern)?.[1];
}

// Newest first. If the same date was uploaded more than once, the latest upload comes first.
export async function listDocuments(kind: DocumentKind): Promise<UploadedDocument[]> {
  if (!supabaseIsConfigured()) return [];
  const folder = DOCUMENT_TYPES[kind].folder;
  // Storage lists at most 1,000 files at a time, so ask for one page after another.
  const data: Awaited<ReturnType<ReturnType<typeof storage>["list"]>>["data"] & object = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await withTimeout(storage().list(folder, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } }));
    if (page.error) {
      if (/not found/i.test(page.error.message)) return []; // bucket not created yet
      throw page.error;
    }
    data.push(...page.data);
    if (page.data.length < 1000) break;
  }
  const names = new Set(data.map((file) => file.name));
  return data
    .flatMap((file) => {
      const date = file.id ? fileDate(kind, file.name) : undefined;
      if (!date) return [];
      const path = `${folder}/${file.name}`;
      const coverName = file.name.replace(/\.pdf$/, ".jpg");
      const coverPath = names.has(coverName) ? `${folder}/${coverName}` : undefined;
      return [{
        date,
        path,
        url: storage().getPublicUrl(path).data.publicUrl,
        coverPath,
        coverUrl: coverPath && storage().getPublicUrl(coverPath).data.publicUrl,
        size: Number(file.metadata?.size ?? 0),
        uploadedAt: new Date(file.created_at ?? 0),
      }];
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.uploadedAt.getTime() - a.uploadedAt.getTime());
}

// Every uploaded document, newest first (one per date), plus the one to show as current.
export async function getPublicDocuments(kind: DocumentKind): Promise<{ current: PublicDocument; archive: PublicDocument[] }> {
  try {
    const seen = new Set<string>();
    const archive = (await listDocuments(kind))
      .filter((d) => !seen.has(d.date) && seen.add(d.date))
      .map((d) => ({ date: d.date, label: formatDocumentDate(kind, d.date), url: d.url, coverUrl: d.coverUrl }));
    if (archive.length) return { current: archive[0], archive };
  } catch (error) {
    // Storage unreachable: fall back rather than break the page.
    console.error(`Could not list ${kind} documents`, error);
  }
  return { current: FALLBACKS[kind], archive: [] };
}

// The bulletin for a Sunday, if one was uploaded. Weekday services (e.g. Good Friday) don't get one.
export async function bulletinForDate(date: string): Promise<PublicDocument | undefined> {
  if (bulletinSunday(date) !== date) return undefined;
  return (await getPublicDocuments("bulletin")).archive.find((d) => d.date === date);
}

// One-off addresses the admin's browser uploads the PDF and its cover picture to directly
// (valid for 2 hours).
export async function createDocumentUploadUrls(kind: DocumentKind, date: string): Promise<{ pdf: string; cover: string }> {
  await ensureStorageBucket();
  const base = `${DOCUMENT_TYPES[kind].folder}/${date}-${randomUUID().slice(0, 8)}`;
  const [pdf, cover] = await Promise.all([
    storage().createSignedUploadUrl(`${base}.pdf`),
    storage().createSignedUploadUrl(`${base}.jpg`),
  ]);
  if (pdf.error) throw pdf.error;
  if (cover.error) throw cover.error;
  return { pdf: pdf.data.signedUrl, cover: cover.data.signedUrl };
}

// Deletes documents along with their cover pictures.
export async function deleteDocuments(documents: UploadedDocument[]): Promise<void> {
  const paths = documents.flatMap((d) => (d.coverPath ? [d.path, d.coverPath] : [d.path]));
  if (!paths.length) return;
  const { error } = await storage().remove(paths);
  if (error) throw error;
}

// Removes older uploads for the same date, so a re-upload replaces the previous file.
export async function removeReplacedDocuments(kind: DocumentKind): Promise<void> {
  const seen = new Set<string>();
  const replaced = (await listDocuments(kind)).filter((d) => (seen.has(d.date) ? true : (seen.add(d.date), false)));
  await deleteDocuments(replaced);
}
