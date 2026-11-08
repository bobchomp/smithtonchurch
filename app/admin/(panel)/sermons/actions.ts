"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireTool } from "@/lib/admin-auth";
import { isBibleBook, sortBooks } from "@/lib/bible";
import { unmatchedStreams, youtubeId } from "@/lib/livestream-match";
import { loadLivestreams, sermonFromStream, syncLivestreams } from "@/lib/livestreams";
import { createAudioUploadUrl, deleteAudio, r2IsConfigured } from "@/lib/r2";
import { isSermonDate, sermonPath, type Sermon, type Service } from "@/lib/sermon-types";
import { addSermons, loadSermons, removeSermon, storeSermon } from "@/lib/sermons";
import { describeStorageError } from "@/lib/supabase";

export type SermonInput = {
  title: string;
  date: string;
  service: Service;
  preacher: string;
  books: string[]; // books of the Bible, empty if not known
  detailsChecked?: boolean; // saved from "Fill in details"
  // "" = match the livestream automatically, "none" = no video, or a YouTube link or video ID.
  video: string;
  audio?: { key: string; size: number; duration?: number };
};

// Refresh the archive and the sermon's page (under its old address too, if the title changed).
function refresh(...sermons: (Pick<Sermon, "id" | "title"> | undefined)[]) {
  revalidatePath("/sermons");
  revalidatePath("/"); // the home page shows the latest sermon
  for (const sermon of sermons) if (sermon) revalidatePath(sermonPath(sermon).replace(/\/$/, ""));
  revalidatePath("/admin/sermons");
}

function audioKeyFor(date: string, service: Service, title: string): string {
  const name = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  return `sermons/${date.slice(0, 4)}/${date}${service ? `-${service}` : ""}-${name || "sermon"}-${randomUUID().slice(0, 6)}.mp3`;
}

// Step 1 of adding audio: get a one-off address for the browser to send the MP3 to.
export async function startAudioUpload(
  date: string,
  service: Service,
  title: string,
  preacher: string,
): Promise<{ upload?: { url: string; headers: Record<string, string> }; key?: string; error?: string }> {
  await requireTool("sermons", "sermon-details"); // Sermon Details can add audio too
  if (!r2IsConfigured()) return { error: "Audio storage (Cloudflare R2) isn’t set up yet." };
  if (!isSermonDate(date)) return { error: "Please choose the date first." };
  const key = audioKeyFor(date, service, title);
  const downloadName = `${date} ${title}${preacher ? ` - ${preacher}` : ""}.mp3`;
  try {
    return { upload: await createAudioUploadUrl(key, downloadName), key };
  } catch (error) {
    return { error: `Couldn’t connect to audio storage. ${(error as Error).message}` };
  }
}

// Checks the shape of what was sent first (a malformed request gets an error rather than a crash).
function wellFormed(input: unknown): input is SermonInput {
  const i = input as Record<string, unknown> | null;
  const str = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
  const audio = i?.audio as Record<string, unknown> | undefined;
  return (
    !!i &&
    typeof i === "object" &&
    str(i.title, 300) &&
    str(i.date, 10) &&
    str(i.service, 2) &&
    str(i.preacher, 150) &&
    str(i.video, 300) &&
    Array.isArray(i.books) &&
    i.books.every((b) => typeof b === "string") &&
    (i.detailsChecked === undefined || typeof i.detailsChecked === "boolean") &&
    (audio === undefined ||
      (!!audio &&
        typeof audio.key === "string" &&
        Number.isSafeInteger(audio.size) &&
        (audio.size as number) > 0 &&
        (audio.duration === undefined || (typeof audio.duration === "number" && audio.duration >= 0 && audio.duration < 24 * 3600))))
  );
}

function validate(input: SermonInput): string | undefined {
  if (!wellFormed(input)) return "Something went wrong with the form. Please reload the page and try again.";
  if (!input.title.trim()) return "Please enter a title.";
  if (!isSermonDate(input.date)) return "Please choose a valid date.";
  if (!["am", "pm", ""].includes(input.service)) return "Please choose a service.";
  if (input.video && input.video !== "none" && !youtubeId(input.video)) return "That doesn’t look like a YouTube link.";
  if (!Array.isArray(input.books) || input.books.length > 20 || !input.books.every(isBibleBook))
    return "Please choose the books of the Bible from the list.";
  if (input.audio && !/^sermons\/\d{4}\/[\w.-]+\.mp3$/.test(input.audio.key)) return "Invalid audio file.";
  return undefined;
}

function clean(input: SermonInput): Omit<Sermon, "id" | "createdAt"> {

  return {
    title: input.title.trim(),
    date: input.date,
    service: input.service,
    preacher: input.preacher.trim(),
    books: sortBooks(input.books),
    book: undefined,
    passage: undefined,
    video: input.video === "none" ? "none" : youtubeId(input.video),
    videoUrl: undefined,
    ...(input.detailsChecked ? { detailsChecked: true } : {}),
  };
}

// Step 2: save the sermon's details (after any audio has finished uploading).
export async function saveSermon(id: number | null, input: SermonInput): Promise<{ id?: number; error?: string }> {
  // Sermon Details may only update existing sermons as it goes through them; everything else needs Sermons.
  if (id !== null && !Number.isSafeInteger(id)) return { error: "That sermon no longer exists." };
  if (id === null || !input?.detailsChecked) await requireTool("sermons");
  else await requireTool("sermons", "sermon-details");
  const problem = validate(input);
  if (problem) return { error: problem };
  try {
    const audio = input.audio ? { audioKey: input.audio.key, audioSize: input.audio.size, duration: input.audio.duration } : {};
    let saved: Sermon;
    let previous: Sermon | undefined;
    let replacedAudio: string | undefined;
    if (id === null) {
      [saved] = await addSermons([{ ...clean(input), ...audio, createdAt: new Date().toISOString() }]);
    } else {
      const existing = (await loadSermons()).find((s) => s.id === id);
      if (!existing) return { error: "That sermon no longer exists." };
      previous = existing;
      if (input.audio && existing.audioKey && existing.audioKey !== input.audio.key) replacedAudio = existing.audioKey;
      saved = { ...existing, ...clean(input), ...audio };
      await storeSermon(saved);
    }
    if (replacedAudio) await deleteAudio(replacedAudio).catch((e) => console.error("Could not delete old audio", e));
    refresh(saved, previous);
    return { id: saved.id };
  } catch (error) {
    console.error("Could not save sermon", error);
    return { error: `Couldn’t save the sermon. ${describeStorageError(error)}` };
  }
}

export async function deleteSermon(formData: FormData): Promise<void> {
  await requireTool("sermons");
  const id = Number(formData.get("id"));
  const sermon = (await loadSermons()).find((s) => s.id === id);
  if (!sermon) return;
  await removeSermon(id);
  if (sermon.audioKey && r2IsConfigured()) await deleteAudio(sermon.audioKey).catch((e) => console.error("Could not delete audio", e));
  refresh(sermon);
}

// "Check YouTube now" in the admin panel.
export async function syncLivestreamsNow(): Promise<{ message: string; ok: boolean }> {
  await requireTool("sermons");
  try {
    const { count, changedPaths, created } = await syncLivestreams();
    revalidatePath("/sermons");
    revalidatePath("/");
    for (const path of changedPaths) revalidatePath(path);
    revalidatePath("/admin/sermons");
    const added = created.length
      ? ` Added ${created.length} new sermon${created.length === 1 ? "" : "s"}: ${created.map((s) => `“${s.title}”`).join(", ")} (check ${created.length === 1 ? "it" : "them"} in Sermon Details).`
      : "";
    return { ok: true, message: `Found ${count} past livestream${count === 1 ? "" : "s"} on YouTube.${added}` };
  } catch (error) {
    console.error("Could not sync livestreams", error);
    return { ok: false, message: `Couldn’t check YouTube. ${(error as Error).message}` };
  }
}

// "Create sermons" for the ticked livestreams: one sermon each, with the stream's title, date,
// service, video and preacher (from the stream's description).
export async function createSermonsFromLivestreams(streamIds: string[]): Promise<{ created?: number; error?: string }> {
  await requireTool("sermons");
  try {
    const [sermons, { streams }] = await Promise.all([loadSermons(), loadLivestreams()]);
    // Only streams that still have no sermon, so pressing the button twice can't make duplicates.
    const available = new Map(unmatchedStreams(sermons, streams).map((s) => [s.id, s]));
    const chosen = [...new Set(streamIds)].map((id) => available.get(id)).filter((s) => s !== undefined);
    if (!chosen.length) return { error: "None of those livestreams still need a sermon." };
    const now = new Date().toISOString();
    const created = await addSermons(chosen.map((stream) => sermonFromStream(stream, now)));
    refresh(...created);
    return { created: created.length };
  } catch (error) {
    console.error("Could not create sermons from livestreams", error);
    return { error: `Couldn’t create the sermons. ${describeStorageError(error)}` };
  }
}
