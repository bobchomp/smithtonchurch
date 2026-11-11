import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import DocumentShowcase from "@/components/DocumentShowcase";
import PageBanner from "@/components/PageBanner";

export const metadata: Metadata = pageMetadata("/weekly-bulletin/", {
  title: "Weekly Bulletin",
  description: "Read this week's Smithton Church bulletin, and past bulletins.",
});

// Refreshed straight away when a bulletin is uploaded in the admin panel, and hourly as a fallback.
export const revalidate = 3600;

export default function WeeklyBulletin() {
  return (
    <>
      <PageBanner title="Weekly Bulletin" />
      <DocumentShowcase
        kind="bulletin"
        eyebrow="This week’s bulletin"
        intro={<p>Catch up on the news, notices and prayer points for the week ahead.</p>}
        readLabel="Read the bulletin"
      />
    </>
  );
}
