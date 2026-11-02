"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import {
  createBulletinUploadUrl,
  deleteBulletins,
  isBulletinDate,
  listBulletins,
  removeReplacedBulletins,
} from "@/lib/bulletins";

function refreshPages() {
  revalidatePath("/weekly-devotional");
  revalidatePath("/admin/bulletin");
}

// Step 1 of an upload: get a one-off address for the browser to send the PDF to.
export async function startBulletinUpload(date: string): Promise<{ uploadUrl?: string; error?: string }> {
  await requireAdmin();
  if (!isBulletinDate(date)) return { error: "Please choose a valid date." };
  try {
    return { uploadUrl: await createBulletinUploadUrl(date) };
  } catch (error) {
    console.error("Could not start bulletin upload", error);
    return { error: "Couldn’t connect to file storage. Please try again shortly." };
  }
}

// Step 2: once the PDF has uploaded, tidy up and refresh the website.
export async function finishBulletinUpload(): Promise<void> {
  await requireAdmin();
  await removeReplacedBulletins();
  refreshPages();
}

export async function deleteBulletin(formData: FormData): Promise<void> {
  await requireAdmin();
  const path = String(formData.get("path") ?? "");
  // Only delete files that really are bulletins.
  const bulletin = (await listBulletins()).find((b) => b.path === path);
  if (bulletin) await deleteBulletins([bulletin.path]);
  refreshPages();
}
