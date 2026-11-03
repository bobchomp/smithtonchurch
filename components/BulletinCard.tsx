import Image from "next/image";
import type { PublicBulletin } from "@/lib/bulletins";

// A past bulletin: its front page and date, linking to the PDF.
export default function BulletinCard({ bulletin }: { bulletin: PublicBulletin }) {
  return (
    <a className="bulletin-card" href={bulletin.url}>
      <span className="bulletin-card-cover">
        {bulletin.coverUrl ? (
          <Image src={bulletin.coverUrl} alt="" width={700} height={990} sizes="220px" unoptimized />
        ) : (
          <Image src="/images/bulletin.jpg" alt="" width={353} height={479} sizes="220px" />
        )}
      </span>
      <span className="bulletin-card-date">{bulletin.label}</span>
      <span className="bulletin-card-link">Read (PDF)</span>
    </a>
  );
}
