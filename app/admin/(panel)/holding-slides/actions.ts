"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity";
import { isHoldingVideoFile, VIDEO_FOLDER } from "@/lib/holding-videos";
import { describeStorageError, ensureStorageBucket, storage } from "@/lib/supabase";

// A one-off address for the owner's browser to upload one holding video file to (replacing any copy already there).
export async function startHoldingVideoUpload(name: string): Promise<{ url: string } | { error: string }> {
  await requireOwner();
  if (!isHoldingVideoFile(name)) return { error: "That isn’t one of the holding video files." };
  try {
    await ensureStorageBucket();
    const { data, error } = await storage().createSignedUploadUrl(`${VIDEO_FOLDER}/${name}`, { upsert: true });
    if (error) throw error;
    return { url: data.signedUrl };
  } catch (error) {
    return { error: `Couldn’t connect to file storage. ${describeStorageError(error)}` };
  }
}

export async function finishHoldingVideoMove(names: string[]): Promise<void> {
  await requireOwner();
  const moved = names.filter(isHoldingVideoFile);
  if (moved.length) await logActivity({ area: "Holding slides", action: `Moved ${moved.length} holding video file${moved.length === 1 ? "" : "s"} to file storage`, details: { files: moved } });
  revalidatePath("/admin/holding-slides");
}
