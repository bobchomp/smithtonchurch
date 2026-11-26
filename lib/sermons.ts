import "server-only";
import { videoPartsForSermons } from "./livestream-match";
import { loadLivestreams } from "./livestreams";
import { audioUrl } from "./r2";
import { cleanSermonTitle, sermonBooks, sermonPath, type PublicSermon, type Sermon } from "./sermon-types";
import { db, selectAll, upsertRows } from "./db";
import { supabaseIsConfigured, withTimeout } from "./supabase";

// Sermons are kept in the database's "sermons" table, one row each (lib/db.ts). The audio itself is
// in Cloudflare R2 (lib/r2.ts).

type SermonRow = { id: number; date: string; service: string; title: string; preacher: string; data: Sermon };

function toRow(sermon: Sermon): SermonRow & { updated_at: string } {
  const data = JSON.parse(JSON.stringify(sermon, (key, value) => (key === "series" ? undefined : value))) as Sermon;
  return {
    id: sermon.id,
    date: sermon.date,
    service: sermon.service ?? "",
    title: sermon.title ?? "",
    preacher: sermon.preacher ?? "",
    data,
    updated_at: new Date().toISOString(),
  };
}

// Every sermon, newest first.
export async function loadSermons(): Promise<Sermon[]> {
  if (!supabaseIsConfigured()) return [];
  // Titles are tidied as they're read (quote marks around the whole title removed), and saved tidied next time.
  const tidy = (s: Sermon): Sermon => ({ ...s, title: cleanSermonTitle(s.title ?? "") });
  const rows = await selectAll<{ data: Sermon }>((from, to) => db().from("sermons").select("data").order("id").range(from, to));
  return rows.map((r) => tidy(r.data)).sort(newestFirst);
}

// Saves one sermon that already has its number (new or changed).
export async function storeSermon(sermon: Sermon): Promise<void> {
  return upsertRows("sermons", [toRow(sermon)], "id");
}

// Adds new sermons, numbering them after the highest number so far (imported ones keep the old
// media site's numbers, all below 10000; new ones start at 10001).
export async function addSermons(sermons: Omit<Sermon, "id">[]): Promise<Sermon[]> {
  for (let attempt = 0; ; attempt++) {
    const existing = await loadSermons();
    let next = Math.max(10000, ...existing.map((s) => s.id));
    const numbered = sermons.map((s) => ({ ...s, id: ++next }) as Sermon);
    // Inserted (not upserted), so two people adding at once can't overwrite each other: the
    // second gets a clash and tries again with the next numbers.
    const { error } = await withTimeout(db().from("sermons").insert(numbered.map(toRow)));
    if (!error) return numbered;
    if ((error as { code?: string }).code !== "23505" || attempt >= 4) throw error;
  }
}

export async function removeSermon(id: number): Promise<void> {
  const { error } = await withTimeout(db().from("sermons").delete().eq("id", id));
  if (error) throw error;
}

export function newestFirst(a: Sermon, b: Sermon): number {
  return b.date.localeCompare(a.date) || (b.service === "pm" ? 1 : 0) - (a.service === "pm" ? 1 : 0) || b.id - a.id;
}

function toPublic(sermon: Sermon, videos: string[] | undefined): PublicSermon {
  const {
    audioKey,
    createdAt: _createdAt,
    video: _video,
    videoParts: _videoParts,
    videoUrl: _videoUrl,
    passage: _passage,
    book: _book,
    books: _books,
    detailsChecked: _detailsChecked,
    ...rest
  } = sermon;
  delete (rest as { series?: string }).series; // older records may still have one
  return {
    ...rest,
    books: sermonBooks(sermon),
    audioUrl: audioUrl(audioKey),
    youtubeId: videos?.[0],
    ...(videos && videos.length > 1 ? { videoParts: videos.slice(1) } : {}),
    path: sermonPath(sermon),
  };
}

// For the public pages: never fail, just show nothing if storage can't be reached.
export async function getPublicSermons(): Promise<PublicSermon[]> {
  try {
    const [sermons, { streams }] = await Promise.all([loadSermons(), loadLivestreams()]);
    const videos = videoPartsForSermons(sermons, streams);
    return sermons.map((s) => toPublic(s, videos.get(s.id)));
  } catch (error) {
    console.error("Could not load sermons", error);
    return [];
  }
}
