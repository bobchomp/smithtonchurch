"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { DOCUMENT_TYPES, isDocumentDate, isDocumentKind, type DocumentKind } from "@/lib/document-types";
import { createDocumentUploadUrls, deleteDocuments, listDocuments, removeReplacedDocuments } from "@/lib/documents";
import { sermonPath } from "@/lib/sermon-types";
import { loadSermons } from "@/lib/sermons";
import { describeStorageError } from "@/lib/supabase";

// Refreshes the document's pages, and for a bulletin the pages of that Sunday's sermons (which link to it).
async function refreshPages(kind: DocumentKind, date?: string) {
  revalidatePath(DOCUMENT_TYPES[kind].publicPath);
  revalidatePath(DOCUMENT_TYPES[kind].adminPath);
  if (kind === "bulletin") revalidatePath("/live");
  if (kind !== "bulletin" || !date) return;
  const sermons = await loadSermons().catch(() => []);
  for (const s of sermons) if (s.date === date) revalidatePath(sermonPath(s).replace(/\/$/, ""));
}

// Step 1 of an upload: get one-off addresses for the browser to send the PDF and cover to.
export async function startDocumentUpload(
  kind: string,
  date: string,
): Promise<{ uploadUrls?: { pdf: string; cover: string }; error?: string }> {
  await requireAdmin();
  if (!isDocumentKind(kind)) return { error: "Unknown document type." };
  if (!isDocumentDate(kind, date)) return { error: "Please choose a valid date." };
  try {
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
  await removeReplacedDocuments(kind);
  await refreshPages(kind, date && isDocumentDate(kind, date) ? date : undefined);
}

export async function deleteDocument(formData: FormData): Promise<void> {
  await requireAdmin();
  const kind = String(formData.get("kind") ?? "");
  const path = String(formData.get("path") ?? "");
  if (!isDocumentKind(kind)) return;
  // Only delete files that really are documents of this kind.
  const found = (await listDocuments(kind)).find((d) => d.path === path);
  if (found) await deleteDocuments([found]);
  await refreshPages(kind, found?.date);
}
