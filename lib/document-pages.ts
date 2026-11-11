import "server-only";
import { formatDocumentDate, isDocumentDate, type DocumentKind, type PublicDocument } from "./document-types";
import { getPublicDocuments } from "./documents";

// The document for a flipbook page's date (e.g. /weekly-bulletin/2026-11-08/), if there is one.
export async function findPublicDocument(kind: DocumentKind, date: string): Promise<PublicDocument | undefined> {
  if (!isDocumentDate(kind, date)) return undefined;
  const { current, archive } = await getPublicDocuments(kind);
  return archive.find((d) => d.date === date) ?? (current.date === date ? { ...current, label: formatDocumentDate(kind, date) } : undefined);
}
