import { ukTimeToIso } from "@/lib/live-notice-types";
import type { Range } from "@/lib/analytics";

// The date ranges in Admin → Analytics, in UK time, and the matching previous period for comparison.

export const RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "12m", label: "12 months" },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];

function ukToday(): { y: number; m: number; d: number } {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date()).split("-").map(Number);
  return { y, m, d };
}

const pad = (n: number) => String(n).padStart(2, "0");
// Midnight (UK time) at the start of a calendar day, which may be outside the current month.
function ukMidnight(y: number, m: number, d: number): Date {
  const t = new Date(Date.UTC(y, m - 1, d));
  return new Date(ukTimeToIso(`${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T00:00`)!);
}

export function rangeFor(key: RangeKey): { current: Range; previous: Range; label: string } {
  const { y, m, d } = ukToday();
  const tomorrow = ukMidnight(y, m, d + 1);
  let current: Range;
  let previous: Range;
  if (key === "today") {
    current = { from: ukMidnight(y, m, d), to: tomorrow, unit: "hour" };
    previous = { from: ukMidnight(y, m, d - 1), to: ukMidnight(y, m, d), unit: "hour" };
  } else if (key === "12m") {
    const from = new Date(ukTimeToIso(`${m === 12 ? y : y - 1}-${pad(m === 12 ? 1 : m + 1)}-01T00:00`)!);
    current = { from, to: tomorrow, unit: "month" };
    previous = { from: new Date(ukTimeToIso(`${m === 12 ? y - 1 : y - 2}-${pad(m === 12 ? 1 : m + 1)}-01T00:00`)!), to: from, unit: "month" };
  } else {
    const days = { "7d": 7, "30d": 30, "90d": 90 }[key];
    current = { from: ukMidnight(y, m, d - days + 1), to: tomorrow, unit: "day" };
    previous = { from: ukMidnight(y, m, d - 2 * days + 1), to: current.from, unit: "day" };
  }
  return { current, previous, label: RANGES.find((r) => r.key === key)!.label };
}

// Every bucket in the range (so days with no visits still show), keyed as the database returns them.
export function buckets(range: Range): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const fmt = (date: Date, opts: Intl.DateTimeFormatOptions) => date.toLocaleString("en-GB", { timeZone: "Europe/London", ...opts });
  const iso = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(date);
  if (range.unit === "hour") {
    const day = iso(range.from);
    for (let h = 0; h < 24; h++) out.push({ key: `${day}T${pad(h)}`, label: `${pad(h)}:00` });
  } else if (range.unit === "month") {
    let [y, m] = iso(range.from).split("-").map(Number);
    const [endY, endM] = iso(new Date(range.to.getTime() - 1)).split("-").map(Number);
    while (y < endY || (y === endY && m <= endM)) {
      const first = new Date(ukTimeToIso(`${y}-${pad(m)}-01T12:00`)!);
      out.push({ key: `${y}-${pad(m)}`, label: fmt(first, { month: "short", year: "2-digit" }) });
      m += 1;
      if (m > 12) [y, m] = [y + 1, 1];
    }
  } else {
    for (let t = new Date(range.from.getTime() + 12 * 36e5); t < range.to; t = new Date(t.getTime() + 864e5)) {
      out.push({ key: iso(t), label: fmt(t, { day: "numeric", month: "short" }) });
    }
  }
  return out;
}

export function bucketKey(bucket: string, unit: Range["unit"]): string {
  return unit === "hour" ? bucket.slice(0, 13) : unit === "month" ? bucket.slice(0, 7) : bucket.slice(0, 10);
}
