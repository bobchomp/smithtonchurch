import "server-only";
import { HOLDING_VIDEOS } from "./holding-slides";
import { storage, supabaseIsConfigured, withTimeout } from "./supabase";

// The holding videos (and their poster pictures) are kept in file storage, in the public "website"
// bucket's holding-videos/ folder. Until a file has been moved there, it's served from the site's own
// public/holding-videos/ folder instead.
export const VIDEO_FOLDER = "holding-videos";

// Every file the videos use, by name (e.g. "service-starting-shortly-verses-v4.mp4").
export function holdingVideoFiles(): string[] {
  return HOLDING_VIDEOS.flatMap((v) => v.revisions.flatMap((r) => [r.file, r.poster])).map((p) => p.split("/").pop()!);
}

export function isHoldingVideoFile(name: string): boolean {
  return holdingVideoFiles().includes(name);
}

// Names of the files already in storage, with their sizes. Empty if storage can't be reached.
export async function storedHoldingVideoFiles(): Promise<Map<string, number>> {
  const found = new Map<string, number>();
  if (!supabaseIsConfigured()) return found;
  try {
    const { data, error } = await withTimeout(storage().list(VIDEO_FOLDER, { limit: 1000 }));
    if (error) throw error;
    for (const f of data ?? []) if (f.id) found.set(f.name, Number((f.metadata as { size?: number } | null)?.size ?? 0));
  } catch (error) {
    console.error("Could not list the holding videos in storage", error);
  }
  return found;
}

// Works out where each file is served from: its storage address once it's there, otherwise the site's own copy.
export function holdingVideoUrl(path: string, stored: Map<string, number>): string {
  const name = path.split("/").pop()!;
  return stored.has(name) ? storage().getPublicUrl(`${VIDEO_FOLDER}/${name}`).data.publicUrl : path;
}
