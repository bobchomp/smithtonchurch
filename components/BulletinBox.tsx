import { documentHref, type PublicDocument } from "@/lib/document-types";

// A bulletin's cover, date and an "Open the bulletin" button (sermon pages and the live page).
export default function BulletinBox({ bulletin, heading }: { bulletin: PublicDocument; heading: string }) {
  return (
    <div className="bulletin-box">
      {bulletin.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bulletin.coverUrl} alt="" width={90} height={127} loading="lazy" />
      )}
      <div>
        <h2>{heading}</h2>
        <p>{bulletin.label}: news, notices and prayer points.</p>
        <a className="button" href={documentHref("bulletin", bulletin)}>
          Open the bulletin
        </a>
      </div>
    </div>
  );
}
