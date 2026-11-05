import type { Metadata } from "next";
import Link from "next/link";
import BulletinBox from "@/components/BulletinBox";
import LiveNotice from "@/components/LiveNotice";
import PageBanner from "@/components/PageBanner";
import { site } from "@/lib/content";
import { getPublicDocuments } from "@/lib/documents";

export const metadata: Metadata = {
  title: "Watch Live",
  description: "Watch Smithton Church's Sunday services live online, at 10:30am and 5:30pm.",
};

// Refreshed when a bulletin is uploaded in the admin panel, and hourly as a fallback.
export const revalidate = 3600;

export default async function WatchLive() {
  // Only an uploaded bulletin (with a date) is shown; not the copy built into the site.
  const { current } = await getPublicDocuments("bulletin");
  const bulletin = current.date ? current : undefined;

  return (
    <>
      <PageBanner title="Watch Live" />
      <section className="section">
        <div className="container narrow live-page">
          <p className="section-intro">
            Sunday services are streamed live at 10:30am and 5:30pm. Can’t join us in person? Watch along here.
          </p>
          <LiveNotice />
          <div className="livestream">
            <iframe
              src={site.livestream_embed}
              title="Smithton Church live stream"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>

          {bulletin && <BulletinBox bulletin={bulletin} heading="This week’s bulletin" />}

          <div className="live-more">
            <h2>Missed a service?</h2>
            <p>Watch or listen again to past sermons.</p>
            <Link className="button button-outline" href="/sermons/">
              Past sermons
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
