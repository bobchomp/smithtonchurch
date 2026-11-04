import type { Metadata } from "next";
import PageBanner from "@/components/PageBanner";
import SermonBrowser from "@/components/SermonBrowser";
import { site } from "@/lib/content";
import { getPublicSermons } from "@/lib/sermons";

export const metadata: Metadata = {
  title: "Sermons",
  description: "Listen to sermons preached at Smithton Church, Inverness, since 2011. Search by preacher, series, Bible book or year.",
};

// Refreshed straight away when a sermon is added or changed in the admin panel, and hourly as a fallback.
export const revalidate = 3600;

export default async function Sermons() {
  const sermons = await getPublicSermons();
  return (
    <>
      <PageBanner title="Sermons" />
      <section className="section">
        <div className="container">
          <p className="section-intro sermon-intro">
            Listen to or download sermons preached at Smithton Church. Sunday services are also streamed live and{" "}
            <a href={site.social.sermons}>available on YouTube</a>.
          </p>
          {sermons.length === 0 ? (
            <p className="sermon-empty">Sermons will appear here soon.</p>
          ) : (
            <SermonBrowser sermons={sermons} />
          )}
        </div>
      </section>
    </>
  );
}
