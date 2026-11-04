// Sermons: shared between the server and the browser (no secrets here).

export type Service = "am" | "pm" | "";

export type Sermon = {
  id: number;
  legacyId?: number; // sermon_id on the old smithtonchurchmedia.com site
  title: string;
  date: string; // YYYY-MM-DD
  service: Service;
  preacher: string;
  series?: string;
  passage?: string; // e.g. "John 1:1-18"
  book?: string; // Bible book, for filtering
  audioKey?: string; // file name in the audio storage (Cloudflare R2)
  audioSize?: number; // bytes
  duration?: number; // seconds
  videoUrl?: string;
  createdAt: string;
};

// The bits of a sermon the public pages need, with the audio address worked out.
export type PublicSermon = Omit<Sermon, "audioKey" | "createdAt"> & { audioUrl?: string; path: string };

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

export function sermonIdFromParam(param: string): number | undefined {
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
