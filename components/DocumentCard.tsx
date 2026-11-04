import Image from "next/image";
import { DOCUMENT_TYPES, type DocumentKind, type PublicDocument } from "@/lib/document-types";

// A past bulletin or newsletter: its front page and date, linking to the PDF.
export default function DocumentCard({ kind, doc }: { kind: DocumentKind; doc: PublicDocument }) {
  const fallback = DOCUMENT_TYPES[kind].defaultCover;
  return (
    <a className="bulletin-card" href={doc.url}>
      <span className="bulletin-card-cover">
        {doc.coverUrl ? (
          <Image src={doc.coverUrl} alt="" width={700} height={990} sizes="220px" unoptimized />
        ) : (
          <Image src={fallback.src} alt="" width={fallback.width} height={fallback.height} sizes="220px" />
        )}
      </span>
      <span className="bulletin-card-date">{doc.label}</span>
      <span className="bulletin-card-link">Read (PDF)</span>
    </a>
  );
}
