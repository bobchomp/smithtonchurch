import type { Metadata } from "next";
import PageBanner from "@/components/PageBanner";
import SermonBrowser from "@/components/SermonBrowser";
import { getPublicSermons } from "@/lib/sermons";

export const metadata: Metadata = {
  title: "Sermons",
  description: "Listen to sermons preached at Smithton Church, Inverness, since 2011. Search by preacher, Bible book or year.",
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
            This page has all of Smithton Church’s Sunday sermons since 2011. Search by title, or choose a preacher, book
            of the Bible, year or service, then listen online or download the audio. More recent services also have the
            video of the livestream.
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
