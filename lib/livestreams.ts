import "server-only";
import { bookFromTitle, sortBooks } from "./bible";
import { streamSlot, unmatchedStreams, videoForSermons, type Livestream } from "./livestream-match";
import type { Sermon } from "./sermon-types";
import { sermonPath } from "./sermon-types";
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
    title: stream.title.trim(),
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

  const oldVideos = videoForSermons(sermons, before.streams);
  const newVideos = videoForSermons(sermons, streams);
  const changedPaths = sermons
    .filter((s) => oldVideos.get(s.id)?.id !== newVideos.get(s.id)?.id)
    .map((s) => sermonPath(s).replace(/\/$/, ""));

  const fresh = unmatchedStreams(sermons, streams).filter((s) => streamSlot(s).date >= AUTO_SERMONS_FROM);
  const created = fresh.length ? await addSermons(fresh.map((s) => sermonFromStream(s))) : [];
  if (created.length) console.log(`Created ${created.length} sermon(s) from new livestreams: ${created.map((s) => s.title).join(", ")}`);
  changedPaths.push(...created.map((s) => sermonPath(s).replace(/\/$/, "")));
  return { count: streams.length, changedPaths, created };
}
