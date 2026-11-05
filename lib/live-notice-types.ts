// Notices shown above the player on the Watch Live page (shared by the server and the browser).

export type LiveNotice = {
  id: string;
  heading: string;
  text: string;
  image?: { path: string; alt: string }; // in the public "website" bucket
  link?: { label: string; url: string };
  startsAt?: string; // ISO time; unset = straight away
  endsAt?: string; // ISO time; unset = until removed
  off?: boolean; // switched off in the admin panel: never shows, whatever the times
  createdAt: string;
  updatedAt: string;
};

// What the live page gets: only the notice that's showing now.
export type PublicLiveNotice = {
  heading: string;
  text: string;
  imageUrl?: string;
  imageAlt?: string;
  link?: { label: string; url: string };
};

export type NoticeStatus = "showing" | "hidden" | "scheduled" | "ended" | "off";

function isOn(notice: LiveNotice, now: number): boolean {
  return !notice.off && (!notice.startsAt || Date.parse(notice.startsAt) <= now) && (!notice.endsAt || now < Date.parse(notice.endsAt));
}

// Only one notice shows at a time: of those that are on, the one that started most recently.
export function currentNotice(notices: LiveNotice[], now = Date.now()): LiveNotice | undefined {
  const started = (n: LiveNotice) => Date.parse(n.startsAt ?? n.createdAt);
  return notices.filter((n) => isOn(n, now)).sort((a, b) => started(b) - started(a))[0];
}

export function noticeStatus(notice: LiveNotice, notices: LiveNotice[], now = Date.now()): NoticeStatus {
  if (notice.off) return "off";
  if (notice.endsAt && Date.parse(notice.endsAt) <= now) return "ended";
  if (notice.startsAt && Date.parse(notice.startsAt) > now) return "scheduled";
  return currentNotice(notices, now)?.id === notice.id ? "showing" : "hidden";
}

// "Sunday 8 November 2026, 10:15am" in UK time.
export function formatNoticeTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
  const time = d
    .toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Europe/London" })
    .replace(/\s/g, "")
    .toLowerCase();
  return `${date.replace(",", "")}, ${time}`;
}

// UK clock time <-> exact time, for the admin form's date and time boxes ("2026-11-08T10:15").
function londonOffset(time: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(time));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - Math.floor(time / 60000) * 60000;
}

export function ukTimeToIso(value: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return undefined;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const first = wall - londonOffset(wall);
  return new Date(wall - londonOffset(first)).toISOString();
}

export function isoToUkTime(iso: string | undefined): string {
  if (!iso) return "";
  const time = Date.parse(iso);
  return new Date(time + londonOffset(time)).toISOString().slice(0, 16);
}
