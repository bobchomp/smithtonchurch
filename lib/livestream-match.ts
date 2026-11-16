// Matching YouTube livestreams to sermons. Safe to use in the browser.
import { cleanSermonTitle, type Sermon, type Service } from "./sermon-types";

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

// Streams that aren't sermons (Church Night, funerals, thanksgiving services): left out of the
// automatic matching and the list of livestreams without a sermon (they can still be picked by hand).
export function isExcludedStream(stream: Pick<Livestream, "title">): boolean {
  return /church\s*night|funeral|thanksgiving\s+service/i.test(stream.title);
}

const LONG_ENOUGH = 10 * 60; // seconds: shorter streams are usually a false start that was restarted

// A slot's livestream(s), in order: the main one (the longest), plus any other parts of the same
// service when the stream was split (same title, at least 10 minutes long).
export function slotStreams(streams: Livestream[], date: string, service: Service): Livestream[] {
  const inSlot = streams.filter((s) => {
    if (isExcludedStream(s)) return false;
    const slot = streamSlot(s);
    return slot.date === date && slot.service === service;
  });
  if (!inSlot.length) return [];
  const main = inSlot.reduce((a, b) => ((b.duration ?? 0) > (a.duration ?? 0) ? b : a));
  const title = cleanSermonTitle(main.title).toLowerCase();
  return inSlot
    .filter((s) => s === main || (cleanSermonTitle(s.title).toLowerCase() === title && (s.duration === undefined || s.duration >= LONG_ENOUGH)))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

// Each sermon's YouTube videos in order (usually one; more when a livestream was split): the ones
// chosen in the admin panel, none (if switched off), or the livestream(s) from the same date and service.
// Further parts added in the admin panel (videoParts) come after.
export function videoPartsForSermons(sermons: Sermon[], streams: Livestream[]): Map<number, string[]> {
  const result = new Map<number, string[]>();
  for (const sermon of sermons) {
    if (sermon.video === "none") continue;
    const first = sermon.video ? [sermon.video] : youtubeId(sermon.videoUrl) ? [youtubeId(sermon.videoUrl)!] : undefined;
    const ids = first ?? (sermon.service ? slotStreams(streams, sermon.date, sermon.service).map((s) => s.id) : []);
    for (const extra of sermon.videoParts ?? []) if (!ids.includes(extra)) ids.push(extra);
    if (ids.length) result.set(sermon.id, ids);
  }
  return result;
}

// A sermon's (first) video, with the livestream's details when it is one.
export function videoForSermons(sermons: Sermon[], streams: Livestream[]): Map<number, Livestream | { id: string }> {
  const byId = new Map(streams.map((s) => [s.id, s]));
  const result = new Map<number, Livestream | { id: string }>();
  for (const [id, ids] of videoPartsForSermons(sermons, streams)) result.set(id, byId.get(ids[0]) ?? { id: ids[0] });
  return result;
}

// Livestreams that no sermon uses, newest first. Excluded streams (above) and very short ones (usually
// a false start that was restarted) are left out; they can still be chosen for a sermon by hand.
export function unmatchedStreams(sermons: Sermon[], streams: Livestream[]): Livestream[] {
  const used = new Set([...videoPartsForSermons(sermons, streams).values()].flat());
  return streams
    .filter((s) => !used.has(s.id) && !isExcludedStream(s) && (s.duration === undefined || s.duration >= LONG_ENOUGH))
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
