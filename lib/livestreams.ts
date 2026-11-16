import "server-only";
import { bookFromTitle, sortBooks } from "./bible";
import { streamSlot, unmatchedStreams, videoPartsForSermons, type Livestream } from "./livestream-match";
import type { Sermon } from "./sermon-types";
import { cleanSermonTitle, sermonPath } from "./sermon-types";
import { logActivity, SYSTEM } from "./activity";
import { addSermons, loadSermons } from "./sermons";
import { ensureStorageBucket, storage, supabaseIsConfigured, withTimeout } from "./supabase";
import { fetchPastLivestreams } from "./youtube";

// The list of past livestreams is saved in Supabase Storage (website/livestreams/index.json) by
// syncLivestreams(), which runs once a day and from the admin panel, so pages don't call YouTube.

const INDEX_PATH = "livestreams/index.json";

export type LivestreamIndex = { syncedAt?: string; streams: Livestream[] };

export async function loadLivestreams(): Promise<LivestreamIndex> {
  if (!supabaseIsConfigured()) return { streams: [] };
  try {
    const { data, error } = await withTimeout(storage().download(INDEX_PATH, { cacheNonce: String(Date.now()) }));
    if (error) return { streams: [] };
    return JSON.parse(await data.text()) as LivestreamIndex;
  } catch (error) {
    console.error("Could not load livestreams", error);
    return { streams: [] };
  }
}

// A new sermon for a livestream: its title, date, service, video and preacher (from the stream's
// description), and the Bible book if the title names one. Left for checking in Sermon Details.
export function sermonFromStream(stream: Livestream, now = new Date().toISOString()): Omit<Sermon, "id"> {
  const { date, service } = streamSlot(stream);
  return {
    title: cleanSermonTitle(stream.title),
    books: sortBooks([bookFromTitle(stream.title)]),
    date,
    service,
    preacher: stream.preacher ?? "",
    video: stream.id,
    duration: stream.duration,
    createdAt: now,
  };
}

// Livestreams from this day on get a sermon automatically when they're found. Older ones (from
// before this was added, mostly covered by the old media site's import) are left to be added by hand.
export const AUTO_SERMONS_FROM = "2026-11-08";

// Fetches every past livestream from YouTube and saves the list. Then makes a sermon for each new
// livestream that hasn't got one (not Church Night, funerals, thanksgiving services or short false
// starts: see unmatchedStreams). Returns how many livestreams there are, the sermons created, and
// the addresses of sermon pages that have changed (so they can be refreshed).
export async function syncLivestreams(): Promise<{ count: number; changedPaths: string[]; created: Sermon[] }> {
  const streams = await fetchPastLivestreams();
  const [before, sermons] = await Promise.all([loadLivestreams(), loadSermons()]);
  await ensureStorageBucket();
  const index: LivestreamIndex = { syncedAt: new Date().toISOString(), streams };
  const { error } = await storage().upload(INDEX_PATH, JSON.stringify(index), {
    upsert: true,
    contentType: "application/json",
    cacheControl: "0",
  });
  if (error) throw error;

  const oldVideos = videoPartsForSermons(sermons, before.streams);
  const newVideos = videoPartsForSermons(sermons, streams);
  const changedPaths = sermons
    .filter((s) => (oldVideos.get(s.id) ?? []).join() !== (newVideos.get(s.id) ?? []).join())
    .map((s) => sermonPath(s).replace(/\/$/, ""));

  const fresh = unmatchedStreams(sermons, streams).filter((s) => streamSlot(s).date >= AUTO_SERMONS_FROM);
  // A service streamed in more than one part (same date, service and title) becomes one sermon with each part.
  const groups = new Map<string, Livestream[]>();
  for (const s of [...fresh].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
    const { date, service } = streamSlot(s);
    const key = `${date} ${service} ${cleanSermonTitle(s.title).toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const newSermons = [...groups.values()].map(([first, ...rest]) => ({
    ...sermonFromStream(first),
    ...(rest.length ? { videoParts: rest.map((s) => s.id), duration: undefined } : {}),
  }));
  const created = newSermons.length ? await addSermons(newSermons) : [];
  for (const s of created) {
    await logActivity({ area: "Sermons", action: "Created a sermon automatically from a new livestream", target: `${s.title} (${s.date})`, details: { preacher: s.preacher, video: s.video } }, SYSTEM);
  }
  changedPaths.push(...created.map((s) => sermonPath(s).replace(/\/$/, "")));
  return { count: streams.length, changedPaths, created };
}
