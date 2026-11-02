import type { Metadata } from "next";
import Image from "next/image";
import PageBanner from "@/components/PageBanner";
import { getCurrentBulletin } from "@/lib/bulletins";

export const metadata: Metadata = {
  title: "Weekly Bulletin",
  description: "Read this week's Smithton Church bulletin.",
};

// Refreshed straight away when a bulletin is uploaded in the admin panel, and hourly as a fallback.
export const revalidate = 3600;

export default async function WeeklyBulletin() {
  const bulletin = await getCurrentBulletin();
  return (
    <>
      <PageBanner title="Weekly Bulletin" />
      <section className="section">
        <div className="container narrow bulletin">
          <a className="bulletin-cover" href={bulletin.url}>
            <Image src="/images/bulletin.jpg" alt="" width={353} height={479} />
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
    </>
  );
}
