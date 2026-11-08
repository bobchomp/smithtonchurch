"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireTool } from "@/lib/admin-auth";
import { ukTimeToIso, type LiveNotice } from "@/lib/live-notice-types";
import {
  createNoticeImageUpload,
  deleteNoticeImages,
  isNoticeImagePath,
  loadNotices,
  NOTICE_IMAGE_TYPES,
  removeNotice,
  storeNotice,
} from "@/lib/live-notices";
import { describeStorageError } from "@/lib/supabase";

const MAX_IMAGE_MEGABYTES = 10;

export type NoticeInput = {
  heading: string;
  text: string;
  image: { path: string; alt: string } | null; // null = no image
  linkLabel: string;
  linkUrl: string;
  startsAt: string; // UK time "YYYY-MM-DDTHH:MM", or "" for straight away
  endsAt: string; // or "" for until removed
};

// Step 1 of adding an image: a one-off address for the browser to upload it to.
export async function startNoticeImageUpload(contentType: string, size: number): Promise<{ url?: string; path?: string; error?: string }> {
  await requireTool("live-notices");
  if (!NOTICE_IMAGE_TYPES[contentType]) return { error: "The image needs to be a JPG, PNG or WebP file." };
  if (size > MAX_IMAGE_MEGABYTES * 1024 * 1024) return { error: `That image is too big. The limit is ${MAX_IMAGE_MEGABYTES} MB.` };
  try {
    return await createNoticeImageUpload(contentType);
  } catch (error) {
    return { error: `Couldn’t connect to file storage. ${describeStorageError(error)}` };
  }
}

function clean(input: NoticeInput): { notice?: Omit<LiveNotice, "id" | "createdAt" | "updatedAt">; error?: string } {
  const heading = input.heading.trim();
  const text = input.text.trim();
  const linkLabel = input.linkLabel.trim();
  const linkUrl = input.linkUrl.trim();
  if (heading.length > 150) return { error: "Please keep the heading under 150 characters." };
  if (text.length > 2000) return { error: "Please keep the message under 2,000 characters." };
  if (input.image && !isNoticeImagePath(input.image.path)) return { error: "Invalid image." };
  if (input.image && !input.image.alt.trim()) return { error: "Please describe the image (for people who can’t see it)." };
  if (!heading && !text && !input.image) return { error: "Please add a heading, a message or an image." };
  if ((linkLabel || linkUrl) && !(linkLabel && linkUrl)) return { error: "For a button, fill in both its text and its link." };
  if (linkUrl && !/^(https?:\/\/[^\s]+|\/[^\s]*)$/.test(linkUrl))
    return { error: "The button link should start with https:// (or / for a page on this website)." };
  const startsAt = input.startsAt ? ukTimeToIso(input.startsAt) : undefined;
  const endsAt = input.endsAt ? ukTimeToIso(input.endsAt) : undefined;
  if (input.startsAt && !startsAt) return { error: "Please choose a valid start date and time." };
  if (input.endsAt && !endsAt) return { error: "Please choose a valid end date and time." };
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) return { error: "The end needs to be after the start." };
  return {
    notice: {
      heading,
      text,
      ...(input.image ? { image: { path: input.image.path, alt: input.image.alt.trim().slice(0, 300) } } : {}),
      ...(linkUrl ? { link: { label: linkLabel.slice(0, 60), url: linkUrl } } : {}),
      ...(startsAt ? { startsAt } : {}),
      ...(endsAt ? { endsAt } : {}),
    },
  };
}

// Step 2: save the notice (new when id is null).
export async function saveNotice(id: string | null, input: NoticeInput): Promise<{ error?: string }> {
  await requireTool("live-notices");
  const { notice, error } = clean(input);
  if (!notice) return { error };
  try {
    const notices = await loadNotices();
    const now = new Date().toISOString();
    let oldImage: string | undefined;
    if (id === null) {
      await storeNotice({ id: randomUUID(), ...notice, createdAt: now, updatedAt: now });
    } else {
      const index = notices.findIndex((n) => n.id === id);
      if (index < 0) return { error: "That notice no longer exists." };
      const existing = notices[index];
      if (existing.image && existing.image.path !== notice.image?.path) oldImage = existing.image.path;
      await storeNotice({ id, ...notice, ...(existing.off ? { off: true } : {}), createdAt: existing.createdAt, updatedAt: now });
    }
    if (oldImage) await deleteNoticeImages([oldImage]);
    revalidatePath("/admin/live-notices");
    return {};
  } catch (error) {
    console.error("Could not save notice", error);
    return { error: `Couldn’t save the notice. ${describeStorageError(error)}` };
  }
}

// The on/off switch in the list of notices.
export async function setNoticeOn(id: string, on: boolean): Promise<{ error?: string }> {
  await requireTool("live-notices");
  try {
    const notices = await loadNotices();
    const notice = notices.find((n) => n.id === id);
    if (!notice) return { error: "That notice no longer exists." };
    if (on) delete notice.off;
    else notice.off = true;
    notice.updatedAt = new Date().toISOString();
    await storeNotice(notice);
    revalidatePath("/admin/live-notices");
    return {};
  } catch (error) {
    return { error: `Couldn’t change the notice. ${describeStorageError(error)}` };
  }
}

export async function deleteNotice(formData: FormData): Promise<void> {
  await requireTool("live-notices");
  const id = String(formData.get("id") ?? "");
  const notices = await loadNotices();
  const notice = notices.find((n) => n.id === id);
  if (!notice) return;
  await removeNotice(id);
  if (notice.image) await deleteNoticeImages([notice.image.path]);
  revalidatePath("/admin/live-notices");
}
