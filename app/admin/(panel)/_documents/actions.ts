"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { DOCUMENT_TYPES, isDocumentDate, isDocumentKind, type DocumentKind } from "@/lib/document-types";
import { createDocumentUploadUrls, deleteDocuments, listDocuments, removeReplacedDocuments } from "@/lib/documents";
import { describeStorageError } from "@/lib/supabase";

function refreshPages(kind: DocumentKind) {
  revalidatePath(DOCUMENT_TYPES[kind].publicPath);
  revalidatePath(DOCUMENT_TYPES[kind].adminPath);
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
export async function finishDocumentUpload(kind: string): Promise<void> {
  await requireAdmin();
  if (!isDocumentKind(kind)) return;
  await removeReplacedDocuments(kind);
  refreshPages(kind);
}

export async function deleteDocument(formData: FormData): Promise<void> {
  await requireAdmin();
  const kind = String(formData.get("kind") ?? "");
  const path = String(formData.get("path") ?? "");
  if (!isDocumentKind(kind)) return;
  // Only delete files that really are documents of this kind.
  const found = (await listDocuments(kind)).find((d) => d.path === path);
  if (found) await deleteDocuments([found]);
  refreshPages(kind);
}
