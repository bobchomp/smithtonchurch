import Image from "next/image";
import { DOCUMENT_TYPES, documentHref, type DocumentKind } from "@/lib/document-types";
import { getPublicDocuments } from "@/lib/documents";
import DocumentCard from "./DocumentCard";
import DocumentFinder from "./DocumentFinder";

const PREVIOUS_COUNT = 3;

// The latest bulletin/newsletter, the few before it, and a way to find older ones.
export default async function DocumentShowcase({
  kind,
  eyebrow,
  intro,
  readLabel,
}: {
  kind: DocumentKind;
  eyebrow: string;
  intro: React.ReactNode;
  readLabel: string;
}) {
  const { singular, defaultCover } = DOCUMENT_TYPES[kind];
  const { current, archive } = await getPublicDocuments(kind);
  const previous = archive.slice(1, 1 + PREVIOUS_COUNT);
  return (
    <>
      <section className="section">
        <div className="container narrow bulletin">
          <a className="bulletin-cover" href={documentHref(kind, current)}>
            {current.coverUrl ? (
              // A picture of the document's first page, made when it was uploaded.
              <Image src={current.coverUrl} alt={`Front page of the ${singular} for ${current.label}`} width={700} height={990} unoptimized />
            ) : (
              <Image src={defaultCover.src} alt="" width={defaultCover.width} height={defaultCover.height} />
            )}
          </a>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{current.label}</h2>
            {intro}
            <p>
              <a className="button" href={documentHref(kind, current)}>{readLabel}</a>
            </p>
          </div>
        </div>
      </section>

      {previous.length > 0 && (
        <section className="section section-alt">
          <div className="container narrow">
            <h2 className="section-title">Previous {singular}s</h2>
            <div className="bulletin-grid">
              {previous.map((d) => (
                <DocumentCard key={d.date} kind={kind} doc={d} />
              ))}
            </div>

            <h2 className="section-title bulletin-finder-title">Looking for an older {singular}?</h2>
            <DocumentFinder kind={kind} archive={archive} />
          </div>
        </section>
      )}
    </>
  );
}
