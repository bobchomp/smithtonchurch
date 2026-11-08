import "server-only";
import { videoForSermons } from "./livestream-match";
import { loadLivestreams } from "./livestreams";
import { audioUrl } from "./r2";
import { sermonBooks, sermonPath, type PublicSermon, type Sermon } from "./sermon-types";
import { copyInOnce, db, selectAll, tableReady, upsertRows } from "./db";
import { isStorageNotFound } from "./private-store";
import { ensureStorageBucket, storage, supabaseIsConfigured, withTimeout } from "./supabase";

// Sermons are kept in the database's "sermons" table, one row each (lib/db.ts). Before the database
// was set up they were one JSON file in Supabase Storage (website/sermons/index.json); that file is
// copied into the table the first time it's used, and kept as a backup. The audio itself is in
// Cloudflare R2 (lib/r2.ts).

const INDEX_PATH = "sermons/index.json";

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

// The old file. Missing = no sermons yet; any other problem throws (so it's never saved over).
async function loadSermonFile(): Promise<Sermon[]> {
  const { data, error } = await withTimeout(storage().download(INDEX_PATH, { cacheNonce: String(Date.now()) }));
  if (error) {
    if (isStorageNotFound(error)) return [];
    throw error;
  }
  return JSON.parse(await data.text()) as Sermon[];
}

async function saveSermonFile(sermons: Sermon[]): Promise<void> {
  await ensureStorageBucket();
  // Series are no longer used: drop any left on older records.
  const body = JSON.stringify([...sermons].sort(newestFirst), (key, value) => (key === "series" ? undefined : value));
  // Sent as plain text (a Blob would be sent as a form upload).
  const { error } = await storage().upload(INDEX_PATH, body, { upsert: true, contentType: "application/json", cacheControl: "0" });
  if (error) throw error;
}

async function useDatabase(): Promise<boolean> {
  if (!(await tableReady("sermons"))) return false;
  await copyInOnce("sermons", async () => {
    const sermons = await loadSermonFile();
    await upsertRows("sermons", sermons.map(toRow), "id");
    return sermons.length;
  });
  return true;
}

// Every sermon, newest first.
export async function loadSermons(): Promise<Sermon[]> {
  if (!supabaseIsConfigured()) return [];
  if (!(await useDatabase())) return (await loadSermonFile()).sort(newestFirst);
  const rows = await selectAll<{ data: Sermon }>((from, to) => db().from("sermons").select("data").order("id").range(from, to));
  return rows.map((r) => r.data).sort(newestFirst);
}

// Saves one sermon that already has its number (new or changed).
export async function storeSermon(sermon: Sermon): Promise<void> {
  if (await useDatabase()) return upsertRows("sermons", [toRow(sermon)], "id");
  const sermons = await loadSermonFile();
  const index = sermons.findIndex((s) => s.id === sermon.id);
  if (index >= 0) sermons[index] = sermon;
  else sermons.push(sermon);
  await saveSermonFile(sermons);
}

// Adds new sermons, numbering them after the highest number so far (imported ones keep the old
// media site's numbers, all below 10000; new ones start at 10001).
export async function addSermons(sermons: Omit<Sermon, "id">[]): Promise<Sermon[]> {
  for (let attempt = 0; ; attempt++) {
    const existing = await loadSermons();
    let next = Math.max(10000, ...existing.map((s) => s.id));
    const numbered = sermons.map((s) => ({ ...s, id: ++next }) as Sermon);
    if (!(await useDatabase())) {
      await saveSermonFile([...existing, ...numbered]);
      return numbered;
    }
    // Inserted (not upserted), so two people adding at once can't overwrite each other: the
    // second gets a clash and tries again with the next numbers.
    const { error } = await withTimeout(db().from("sermons").insert(numbered.map(toRow)));
    if (!error) return numbered;
    if ((error as { code?: string }).code !== "23505" || attempt >= 4) throw error;
  }
}

export async function removeSermon(id: number): Promise<void> {
  if (await useDatabase()) {
    const { error } = await withTimeout(db().from("sermons").delete().eq("id", id));
    if (error) throw error;
    return;
  }
  await saveSermonFile((await loadSermonFile()).filter((s) => s.id !== id));
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
  delete (rest as { series?: string }).series; // older records may still have one
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
