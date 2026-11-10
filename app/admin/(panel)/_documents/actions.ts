"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireTool } from "@/lib/admin-auth";
import type { AdminTool } from "@/lib/admin-tools";
import { DOCUMENT_TYPES, formatDocumentDate, isDocumentDate, isDocumentKind, type DocumentKind } from "@/lib/document-types";
import { createDocumentUploadUrls, deleteDocuments, listDocuments, removeReplacedDocuments } from "@/lib/documents";
import { sermonPath } from "@/lib/sermon-types";
import { loadSermons } from "@/lib/sermons";
import { logActivity } from "@/lib/activity";
import { describeStorageError } from "@/lib/supabase";

// The admin tool each kind of document belongs to.
const TOOL: Record<DocumentKind, AdminTool> = { bulletin: "bulletin", newsletter: "newsletter" };

// Refreshes the document's pages, and for a bulletin the pages of that Sunday's sermons (which link to it).
async function refreshPages(kind: DocumentKind, date?: string) {
  revalidatePath(DOCUMENT_TYPES[kind].publicPath);
  revalidatePath(DOCUMENT_TYPES[kind].adminPath);
  if (kind === "bulletin") {
    revalidatePath("/live");
    revalidatePath("/"); // the home page shows this week's bulletin
  }
  if (kind !== "bulletin" || !date) return;
  const sermons = await loadSermons().catch(() => []);
  for (const s of sermons) if (s.date === date) revalidatePath(sermonPath(s).replace(/\/$/, ""));
}

export type ExistingDocument = { url: string; coverUrl?: string; size: number; uploadedAt: string };

// Step 1 of an upload: get one-off addresses for the browser to send the PDF and cover to.
// Only one document can be shown for each date: if there's already one, it's returned instead (as
// `existing`) so the admin can choose, unless `replace` says they've chosen the new one.
export async function startDocumentUpload(
  kind: string,
  date: string,
  replace = false,
): Promise<{ uploadUrls?: { pdf: string; cover: string }; existing?: ExistingDocument; error?: string }> {
  await requireAdmin();
  if (!isDocumentKind(kind)) return { error: "Unknown document type." };
  await requireTool(TOOL[kind]);
  if (!isDocumentDate(kind, date)) return { error: "Please choose a valid date." };
  try {
    if (!replace) {
      const found = (await listDocuments(kind)).find((d) => d.date === date);
      if (found) return { existing: { url: found.url, coverUrl: found.coverUrl, size: found.size, uploadedAt: found.uploadedAt.toISOString() } };
    }
    return { uploadUrls: await createDocumentUploadUrls(kind, date) };
  } catch (error) {
    console.error(`Could not start ${kind} upload`, error);
    return { error: `Couldn’t connect to file storage. ${describeStorageError(error)}` };
  }
}

// Step 2: once the PDF has uploaded, tidy up and refresh the website.
export async function finishDocumentUpload(kind: string, date?: string): Promise<void> {
  await requireAdmin();
  if (!isDocumentKind(kind)) return;
  await requireTool(TOOL[kind]);
  const replaced = await removeReplacedDocuments(kind);
  const valid = date && isDocumentDate(kind, date) ? date : undefined;
  await logActivity({
    area: kind === "bulletin" ? "Bulletins" : "Newsletters",
    action: `${valid && replaced.includes(valid) ? "Replaced" : "Uploaded"} the ${DOCUMENT_TYPES[kind].singular}`,
    target: valid ? formatDocumentDate(kind, valid) : undefined,
  });
  await refreshPages(kind, valid);
}

export async function deleteDocument(formData: FormData): Promise<void> {
  await requireAdmin();
  const kind = String(formData.get("kind") ?? "");
  const path = String(formData.get("path") ?? "");
  if (!isDocumentKind(kind)) return;
  await requireTool(TOOL[kind]);
  // Only delete files that really are documents of this kind.
  const found = (await listDocuments(kind)).find((d) => d.path === path);
  if (found) {
    await deleteDocuments([found]);
    await logActivity({
      area: kind === "bulletin" ? "Bulletins" : "Newsletters",
      action: `Deleted the ${DOCUMENT_TYPES[kind].singular}`,
      target: formatDocumentDate(kind, found.date),
    });
  }
  await refreshPages(kind, found?.date);
}
