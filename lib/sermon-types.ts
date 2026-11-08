// Sermons: shared between the server and the browser (no secrets here).

import { bookFromPassage, sortBooks } from "./bible";

export type Service = "am" | "pm" | "";

export type Sermon = {
  id: number;
  legacyId?: number; // sermon_id on the old smithtonchurchmedia.com site
  title: string;
  date: string; // YYYY-MM-DD
  service: Service;
  preacher: string;
  books?: string[]; // the books of the Bible the sermon is from, in Bible order, e.g. ["Ruth"]
  book?: string; // older field: a single book. Use sermonBooks() to read either.
  passage?: string; // older field (chapter and verse); only used to work out the book if nothing else is set
  // Set once someone has gone through the sermon in Admin → Sermons → Fill in details.
  detailsChecked?: boolean;
  audioKey?: string; // file name in the audio storage (Cloudflare R2)
  audioSize?: number; // bytes
  duration?: number; // seconds
  // The YouTube video: unset = match the livestream from the same date and service automatically,
  // "none" = no video, otherwise a YouTube video ID chosen in the admin panel.
  video?: string;
  videoUrl?: string; // older field: a video link entered by hand
  createdAt: string;
};

// The bits of a sermon the public pages need, with the audio address and video worked out.
export type PublicSermon = Omit<
  Sermon,
  "audioKey" | "createdAt" | "video" | "videoUrl" | "passage" | "book" | "books" | "detailsChecked"
> & {
  books: string[];
  audioUrl?: string;
  youtubeId?: string;
  path: string;
};

// The sermon's Bible books, whichever way they were saved.
export function sermonBooks(sermon: Pick<Sermon, "books" | "book" | "passage">): string[] {
  if (sermon.books?.length) return sortBooks(sermon.books);
  const one = sermon.book ?? bookFromPassage(sermon.passage);
  return one ? [one] : [];
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['‘’"“”]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

// /sermons/1632-life-is-a-breath/ – only the number matters when looking a sermon up.
export function sermonPath(sermon: Pick<Sermon, "id" | "title">): string {
  const s = slug(sermon.title);
  return `/sermons/${sermon.id}${s ? `-${s}` : ""}/`;
}

// The sermon number from its address, e.g. "1632-the-good-shepherd" -> 1632. Only addresses shaped
// like the site's own (a number, then lower-case words joined by hyphens) are accepted, so made-up
// addresses get "page not found" instead of each being remembered as a redirect.
export function sermonIdFromParam(param: string): number | undefined {
  if (param.length > 120 || !/^\d{1,6}(-[a-z0-9]+)*$/.test(param)) return undefined;
  const id = Number(param.match(/^(\d+)/)?.[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

// "2026-02-15" -> "Sunday 15 February 2026"
export function formatSermonDate(date: string): string {
  return new Date(`${date}T12:00:00Z`)
    .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .replace(",", "");
}

export function serviceLabel(service: Service): string {
  return service === "am" ? "Morning" : service === "pm" ? "Evening" : "";
}

// 2207 -> "36:47"
export function formatDuration(seconds: number | undefined): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function isSermonDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}
