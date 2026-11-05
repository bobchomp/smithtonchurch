// The kinds of document the admin panel can upload (weekly bulletin, Marsali's newsletter...).
// This file is safe to use in the browser; the storage code is in lib/documents.ts.

export type DocumentKind = "bulletin" | "newsletter";

type DocumentType = {
  // "day" documents are for a particular Sunday (YYYY-MM-DD); "month" ones for a month (YYYY-MM).
  precision: "day" | "month";
  folder: string; // folder in the Supabase "website" bucket
  title: string;
  singular: string; // "bulletin", "newsletter"
  publicPath: string;
  adminPath: string;
  // Shown when an upload has no front-page picture.
  defaultCover: { src: string; width: number; height: number };
};

export const DOCUMENT_TYPES: Record<DocumentKind, DocumentType> = {
  bulletin: {
    precision: "day",
    folder: "bulletins",
    title: "Weekly Bulletin",
    singular: "bulletin",
    publicPath: "/weekly-bulletin",
    adminPath: "/admin/bulletin",
    defaultCover: { src: "/images/bulletin.jpg", width: 353, height: 479 },
  },
  newsletter: {
    precision: "month",
    // Kept as "musings" (the newsletter's old name) so files already uploaded are still found.
    folder: "musings",
    title: "Marsali’s Newsletter",
    singular: "newsletter",
    publicPath: "/missions/marsalis-newsletter",
    adminPath: "/admin/marsalis-newsletter",
    defaultCover: { src: "/images/missions/marsali.jpg", width: 400, height: 400 },
  },
};

export function isDocumentKind(value: string): value is DocumentKind {
  return Object.hasOwn(DOCUMENT_TYPES, value);
}

export function isDocumentDate(kind: DocumentKind, value: string): boolean {
  const pattern = DOCUMENT_TYPES[kind].precision === "day" ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-(0[1-9]|1[0-2])$/;
  const full = DOCUMENT_TYPES[kind].precision === "day" ? value : `${value}-01`;
  return pattern.test(value) && !Number.isNaN(Date.parse(`${full}T00:00:00Z`));
}

// "2026-11-08" -> "Sunday 8 November 2026"; "2026-07" -> "July 2026"
export function formatDocumentDate(kind: DocumentKind, date: string): string {
  const day = DOCUMENT_TYPES[kind].precision === "day";
  return new Date(`${day ? date : `${date}-01`}T12:00:00Z`)
    .toLocaleDateString(
      "en-GB",
      day
        ? { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
        : { month: "long", year: "numeric", timeZone: "UTC" },
    )
    .replace(",", "");
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// What the public site needs to know about each document.
export type PublicDocument = { date: string; label: string; url: string; coverUrl?: string };

// The Sunday on or before a date (YYYY-MM-DD): the weekly bulletin a day belongs to.
export function bulletinSunday(date: string): string {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - day.getUTCDay());
  return day.toISOString().slice(0, 10);
}
