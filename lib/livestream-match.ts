// Matching YouTube livestreams to sermons. Safe to use in the browser.
import type { Sermon, Service } from "./sermon-types";

export type Livestream = {
  id: string; // YouTube video ID
  title: string;
  startedAt: string; // ISO time the stream started
  duration?: number; // seconds
  preacher?: string; // the stream's description, which is just the preacher's name
};

// When a stream started, as a UK date and service: before 2pm counts as the morning service.
export function streamSlot(stream: Pick<Livestream, "startedAt">): { date: string; service: Service } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(stream.startedAt))
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, service: Number(parts.hour) < 14 ? "am" : "pm" };
}

// Streams that are never sermons, e.g. "Church Night" on Wednesdays: left out of the automatic
// matching and the list of livestreams without a sermon (they can still be picked by hand).
export function isExcludedStream(stream: Pick<Livestream, "title">): boolean {
  return /church\s*night/i.test(stream.title);
}

// The livestream for each slot ("2026-02-15 am"); if a service was streamed twice, the longest.
function streamsBySlot(streams: Livestream[]): Map<string, Livestream> {
  const bySlot = new Map<string, Livestream>();
  for (const stream of streams) {
    if (isExcludedStream(stream)) continue;
    const { date, service } = streamSlot(stream);
    const key = `${date} ${service}`;
    const current = bySlot.get(key);
    if (!current || (stream.duration ?? 0) > (current.duration ?? 0)) bySlot.set(key, stream);
  }
  return bySlot;
}

// A sermon's video: one chosen in the admin panel, none (if switched off), or the livestream from
// the same date and service.
export function videoForSermons(sermons: Sermon[], streams: Livestream[]): Map<number, Livestream | { id: string }> {
  const bySlot = streamsBySlot(streams);
  const byId = new Map(streams.map((s) => [s.id, s]));
  const result = new Map<number, Livestream | { id: string }>();
  for (const sermon of sermons) {
    if (sermon.video === "none") continue;
    if (sermon.video) {
      result.set(sermon.id, byId.get(sermon.video) ?? { id: sermon.video });
      continue;
    }
    const legacy = youtubeId(sermon.videoUrl);
    if (legacy) {
      result.set(sermon.id, byId.get(legacy) ?? { id: legacy });
      continue;
    }
    const match = sermon.service ? bySlot.get(`${sermon.date} ${sermon.service}`) : undefined;
    if (match) result.set(sermon.id, match);
  }
  return result;
}

// Livestreams that no sermon uses, newest first. Church Night and very short streams (usually a
// false start that was restarted) are left out; they can still be chosen for a sermon by hand.
export function unmatchedStreams(sermons: Sermon[], streams: Livestream[]): Livestream[] {
  const used = new Set([...videoForSermons(sermons, streams).values()].map((v) => v.id));
  return streams
    .filter((s) => !used.has(s.id) && !isExcludedStream(s) && (s.duration === undefined || s.duration >= 10 * 60))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

// Pulls the video ID out of a YouTube link (or returns it if it already is one).
export function youtubeId(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const value = text.trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  const match = value.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return match?.[1];
}

export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
