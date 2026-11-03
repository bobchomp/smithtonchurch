import type { Metadata } from "next";
import Image from "next/image";
import BulletinCard from "@/components/BulletinCard";
import BulletinFinder from "@/components/BulletinFinder";
import PageBanner from "@/components/PageBanner";
import { getPublicBulletins } from "@/lib/bulletins";

export const metadata: Metadata = {
  title: "Weekly Bulletin",
  description: "Read this week's Smithton Church bulletin, and past bulletins.",
};

// Refreshed straight away when a bulletin is uploaded in the admin panel, and hourly as a fallback.
export const revalidate = 3600;

const PREVIOUS_COUNT = 3;

export default async function WeeklyBulletin() {
  const { current: bulletin, archive } = await getPublicBulletins();
  const previous = archive.slice(1, 1 + PREVIOUS_COUNT);
  return (
    <>
      <PageBanner title="Weekly Bulletin" />
      <section className="section">
        <div className="container narrow bulletin">
          <a className="bulletin-cover" href={bulletin.url}>
            {bulletin.coverUrl ? (
              // A picture of the bulletin's first page, made when it was uploaded.
              <Image src={bulletin.coverUrl} alt={`Front page of the bulletin for ${bulletin.label}`} width={700} height={990} unoptimized />
            ) : (
              <Image src="/images/bulletin.jpg" alt="" width={353} height={479} />
            )}
          </a>
          <div>
            <p className="eyebrow">This week’s bulletin</p>
            <h2>{bulletin.label}</h2>
            <p>Catch up on the news, notices and prayer points for the week ahead.</p>
            <p>
              <a className="button" href={bulletin.url}>Read the bulletin (PDF)</a>
            </p>
          </div>
        </div>
      </section>

      {previous.length > 0 && (
        <section className="section section-alt">
          <div className="container narrow">
            <h2 className="section-title">Previous bulletins</h2>
            <div className="bulletin-grid">
              {previous.map((b) => (
                <BulletinCard key={b.date} bulletin={b} />
              ))}
            </div>

            <h2 className="section-title bulletin-finder-title">Looking for an older bulletin?</h2>
            <BulletinFinder archive={archive} />
          </div>
        </section>
      )}
    </>
  );
}
