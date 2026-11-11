import Link from "next/link";
import { notFound } from "next/navigation";
import { DOCUMENT_TYPES, type DocumentKind } from "@/lib/document-types";
import { findPublicDocument } from "@/lib/document-pages";
import DocumentFlipbook from "./DocumentFlipbook";
import PageBanner from "./PageBanner";

// A bulletin or newsletter in the flipbook viewer. The page itself is cached; the viewer link
// (which expires) is fetched by the browser from /api/flipbook/viewer/.
export default async function DocumentViewerPage({ kind, date }: { kind: DocumentKind; date: string }) {
  const doc = await findPublicDocument(kind, date);
  if (!doc) notFound();
  const type = DOCUMENT_TYPES[kind];
  return (
    <>
      <PageBanner title={type.title} />
      <section className="section document-viewer-section">
        <div className="container">
          <div className="document-viewer-head">
            <h2>{doc.label}</h2>
            <Link href={`${type.publicPath}/`} className="document-viewer-back">
              <span aria-hidden="true">←</span> All {type.singular}s
            </Link>
          </div>
          <DocumentFlipbook kind={kind} date={doc.date} pdfUrl={doc.url} title={`${type.title}: ${doc.label}`} singular={type.singular} />
        </div>
      </section>
    </>
  );
}
