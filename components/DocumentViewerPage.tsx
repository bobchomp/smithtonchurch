import { notFound } from "next/navigation";
import { DOCUMENT_TYPES, type DocumentKind } from "@/lib/document-types";
import { findPublicDocument } from "@/lib/document-pages";
import DocumentFlipbook from "./DocumentFlipbook";

// A bulletin or newsletter in the flipbook viewer, filling the space between the header and footer.
// The page itself is cached; the viewer link (which expires) is fetched by the browser from /api/flipbook/viewer/.
export default async function DocumentViewerPage({ kind, date }: { kind: DocumentKind; date: string }) {
  const doc = await findPublicDocument(kind, date);
  if (!doc) notFound();
  const type = DOCUMENT_TYPES[kind];
  return (
    <>
      <h1 className="visually-hidden">{`${type.title}: ${doc.label}`}</h1>
      <DocumentFlipbook kind={kind} date={doc.date} pdfUrl={doc.url} title={`${type.title}: ${doc.label}`} singular={type.singular} />
    </>
  );
}
