"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { bookFromPassage } from "@/lib/bible";
import { streamSlot, unmatchedStreams, youtubeId } from "@/lib/livestream-match";
import { loadLivestreams, syncLivestreams } from "@/lib/livestreams";
import { createAudioUploadUrl, deleteAudio, r2IsConfigured } from "@/lib/r2";
import { isSermonDate, sermonPath, type Sermon, type Service } from "@/lib/sermon-types";
import { loadSermons, saveSermons } from "@/lib/sermons";
import { describeStorageError } from "@/lib/supabase";

export type SermonInput = {
  title: string;
  date: string;
  service: Service;
  preacher: string;
  series: string;
  passage: string;
  // "" = match the livestream automatically, "none" = no video, or a YouTube link or video ID.
  video: string;
  audio?: { key: string; size: number; duration?: number };
};

// Refresh the archive and the sermon's page (under its old address too, if the title changed).
function refresh(...sermons: (Pick<Sermon, "id" | "title"> | undefined)[]) {
  revalidatePath("/sermons");
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
  await requireAdmin();
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

function validate(input: SermonInput): string | undefined {
  if (!input.title.trim()) return "Please enter a title.";
  if (!isSermonDate(input.date)) return "Please choose a valid date.";
  if (!["am", "pm", ""].includes(input.service)) return "Please choose a service.";
  if (input.video && input.video !== "none" && !youtubeId(input.video)) return "That doesn’t look like a YouTube link.";
  if (input.audio && !/^sermons\/\d{4}\/[\w.-]+\.mp3$/.test(input.audio.key)) return "Invalid audio file.";
  return undefined;
}

function clean(input: SermonInput): Omit<Sermon, "id" | "createdAt"> {
  const passage = input.passage.trim() || undefined;
  return {
    title: input.title.trim(),
    date: input.date,
    service: input.service,
    preacher: input.preacher.trim(),
    series: input.series.trim() || undefined,
    passage,
    book: bookFromPassage(passage),
    video: input.video === "none" ? "none" : youtubeId(input.video),
    videoUrl: undefined,
  };
}

// Step 2: save the sermon's details (after any audio has finished uploading).
export async function saveSermon(id: number | null, input: SermonInput): Promise<{ id?: number; error?: string }> {
  await requireAdmin();
  const problem = validate(input);
  if (problem) return { error: problem };
  try {
    const sermons = await loadSermons();
    const audio = input.audio ? { audioKey: input.audio.key, audioSize: input.audio.size, duration: input.audio.duration } : {};
    let saved: Sermon;
    let previous: Sermon | undefined;
    let replacedAudio: string | undefined;
    if (id === null) {
      // Sermons imported from the old media site keep its numbers (all below 10000); new ones start at 10001.
      saved = { id: Math.max(10000, ...sermons.map((s) => s.id)) + 1, ...clean(input), ...audio, createdAt: new Date().toISOString() };
      sermons.push(saved);
    } else {
      const index = sermons.findIndex((s) => s.id === id);
      if (index < 0) return { error: "That sermon no longer exists." };
      const existing = sermons[index];
      previous = existing;
      if (input.audio && existing.audioKey && existing.audioKey !== input.audio.key) replacedAudio = existing.audioKey;
      saved = { ...existing, ...clean(input), ...audio };
      sermons[index] = saved;
    }
    await saveSermons(sermons);
    if (replacedAudio) await deleteAudio(replacedAudio).catch((e) => console.error("Could not delete old audio", e));
    refresh(saved, previous);
    return { id: saved.id };
  } catch (error) {
    console.error("Could not save sermon", error);
    return { error: `Couldn’t save the sermon. ${describeStorageError(error)}` };
  }
}

export async function deleteSermon(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const sermons = await loadSermons();
  const sermon = sermons.find((s) => s.id === id);
  if (!sermon) return;
  await saveSermons(sermons.filter((s) => s.id !== id));
  if (sermon.audioKey && r2IsConfigured()) await deleteAudio(sermon.audioKey).catch((e) => console.error("Could not delete audio", e));
  refresh(sermon);
}

// "Check YouTube now" in the admin panel.
export async function syncLivestreamsNow(): Promise<{ message: string; ok: boolean }> {
  await requireAdmin();
  try {
    const { count, changedPaths } = await syncLivestreams();
    revalidatePath("/sermons");
    for (const path of changedPaths) revalidatePath(path);
    revalidatePath("/admin/sermons");
    return { ok: true, message: `Found ${count} past livestream${count === 1 ? "" : "s"} on YouTube.` };
  } catch (error) {
    console.error("Could not sync livestreams", error);
    return { ok: false, message: `Couldn’t check YouTube. ${(error as Error).message}` };
  }
}

// "Create sermons" for the ticked livestreams: one sermon each, with the stream's title, date,
// service, video and preacher (from the stream's description).
export async function createSermonsFromLivestreams(streamIds: string[]): Promise<{ created?: number; error?: string }> {
  await requireAdmin();
  try {
    const [sermons, { streams }] = await Promise.all([loadSermons(), loadLivestreams()]);
    // Only streams that still have no sermon, so pressing the button twice can't make duplicates.
    const available = new Map(unmatchedStreams(sermons, streams).map((s) => [s.id, s]));
    const chosen = [...new Set(streamIds)].map((id) => available.get(id)).filter((s) => s !== undefined);
    if (!chosen.length) return { error: "None of those livestreams still need a sermon." };
    let nextId = Math.max(10000, ...sermons.map((s) => s.id));
    const now = new Date().toISOString();
    const created = chosen.map((stream): Sermon => {
      const { date, service } = streamSlot(stream);
      return {
        id: ++nextId,
        title: stream.title.trim(),
        date,
        service,
        preacher: stream.preacher ?? "",
        video: stream.id,
        duration: stream.duration,
        createdAt: now,
      };
    });
    await saveSermons([...sermons, ...created]);
    refresh(...created);
    return { created: created.length };
  } catch (error) {
    console.error("Could not create sermons from livestreams", error);
    return { error: `Couldn’t create the sermons. ${describeStorageError(error)}` };
  }
}
