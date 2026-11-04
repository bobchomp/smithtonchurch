import "server-only";
import { videoForSermons } from "./livestream-match";
import { loadLivestreams } from "./livestreams";
import { audioUrl } from "./r2";
import { sermonBooks, sermonPath, type PublicSermon, type Sermon } from "./sermon-types";
import { ensureStorageBucket, storage, supabaseIsConfigured, withTimeout } from "./supabase";

// The list of sermons is one JSON file in Supabase Storage (website/sermons/index.json): about
// 100 sermons a year, so even decades of them are a small file, and there's no database to set up.
// The audio itself is in Cloudflare R2 (lib/r2.ts).

const INDEX_PATH = "sermons/index.json";

export async function loadSermons(): Promise<Sermon[]> {
  if (!supabaseIsConfigured()) return [];
  const { data, error } = await withTimeout(storage().download(INDEX_PATH, { cacheNonce: String(Date.now()) }));
  if (error) {
    // Nothing saved yet (or no bucket yet).
    if (/not found|does not exist|404|400/i.test(`${error.message} ${(error as { status?: number }).status ?? ""}`)) return [];
    throw error;
  }
  const sermons = JSON.parse(await data.text()) as Sermon[];
  return sermons.sort(newestFirst);
}

export async function saveSermons(sermons: Sermon[]): Promise<void> {
  await ensureStorageBucket();
  const body = JSON.stringify([...sermons].sort(newestFirst));
  // Sent as plain text (a Blob would be sent as a form upload).
  const { error } = await storage().upload(INDEX_PATH, body, {
    upsert: true,
    contentType: "application/json",
    cacheControl: "0",
  });
  if (error) throw error;
}

export function newestFirst(a: Sermon, b: Sermon): number {
  return b.date.localeCompare(a.date) || (b.service === "pm" ? 1 : 0) - (a.service === "pm" ? 1 : 0) || b.id - a.id;
}

function toPublic(sermon: Sermon, youtubeId: string | undefined): PublicSermon {
  const {
    audioKey,
    createdAt: _createdAt,
    video: _video,
    videoUrl: _videoUrl,
    passage: _passage,
    book: _book,
    books: _books,
    detailsChecked: _detailsChecked,
    ...rest
  } = sermon;
  return {
    ...rest,
    books: sermonBooks(sermon),
    audioUrl: audioUrl(audioKey),
    youtubeId,
    path: sermonPath(sermon),
  };
}

// For the public pages: never fail, just show nothing if storage can't be reached.
export async function getPublicSermons(): Promise<PublicSermon[]> {
  try {
    const [sermons, { streams }] = await Promise.all([loadSermons(), loadLivestreams()]);
    const videos = videoForSermons(sermons, streams);
    return sermons.map((s) => toPublic(s, videos.get(s.id)?.id));
  } catch (error) {
    console.error("Could not load sermons", error);
    return [];
  }
}
