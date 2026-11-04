import "server-only";
import { videoForSermons, type Livestream } from "./livestream-match";
import { sermonPath } from "./sermon-types";
import { loadSermons } from "./sermons";
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

// Fetches every past livestream from YouTube and saves the list. Returns how many there are, and
// the addresses of sermon pages whose video has changed (so they can be refreshed).
export async function syncLivestreams(): Promise<{ count: number; changedPaths: string[] }> {
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
  return { count: streams.length, changedPaths };
}
