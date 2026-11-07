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

// A date in an uploaded file's name, so the upload form can fill it in. Finds "20261011", "2026-10-11",
// "11 October 2026", "11th Oct 2026" and so on; with precision "month", also "October 2026" or "202610".
// Returns YYYY-MM-DD (or YYYY-MM), or undefined if there's no real date in the name.
export function dateFromFileName(name: string, precision: "day" | "month"): string | undefined {
  const base = name.replace(/\.[a-z0-9]+$/i, "");
  const pad = (n: number) => String(n).padStart(2, "0");
  const real = (y: number, m: number, d: number) => {
    const t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
  };
  const monthOf = (word: string) => {
    const i = MONTH_NAMES.findIndex((m) => m.toLowerCase().startsWith(word.toLowerCase().slice(0, 3)));
    return word.length >= 3 && i >= 0 && MONTH_NAMES[i].toLowerCase().startsWith(word.toLowerCase().replace(/\.$/, "")) ? i + 1 : 0;
  };
  const found = (y: number, m: number, d?: number) =>
    precision === "month" ? `${y}-${pad(m)}` : d && real(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : undefined;

  // 20261011, 2026-10-11, 2026_10_11, 2026.10.11
  for (const m of base.matchAll(/(?<!\d)(20\d\d)[-_. ]?(0[1-9]|1[0-2])[-_. ]?(0[1-9]|[12]\d|3[01])(?!\d)/g)) {
    const r = found(+m[1], +m[2], +m[3]);
    if (r) return r;
  }
  // 11 October 2026, 11th Oct 2026, 11-October-2026
  for (const m of base.matchAll(/(?<!\d)(\d{1,2})(?:st|nd|rd|th)?[\s_.-]+([a-z]{3,9}\.?)[\s_.,-]+(20\d\d)(?!\d)/gi)) {
    const month = monthOf(m[2]);
    const r = month ? found(+m[3], month, +m[1]) : undefined;
    if (r) return r;
  }
  if (precision === "month") {
    // October 2026, Oct-2026
    for (const m of base.matchAll(/([a-z]{3,9})[\s_.,-]+(20\d\d)(?!\d)/gi)) {
      const month = monthOf(m[1]);
      if (month) return `${m[2]}-${pad(month)}`;
    }
    // 202610, 2026-10
    const m = base.match(/(?<!\d)(20\d\d)[-_. ]?(0[1-9]|1[0-2])(?!\d)/);
    if (m) return `${m[1]}-${m[2]}`;
  }
  return undefined;
}
