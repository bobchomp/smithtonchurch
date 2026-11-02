import type { Metadata } from "next";
import Image from "next/image";
import PageBanner from "@/components/PageBanner";
import { bulletin } from "@/lib/content";

export const metadata: Metadata = {
  title: "Weekly Bulletin",
  description: "Read this week's Smithton Church bulletin.",
};

export default function WeeklyBulletin() {
  const href = `/docs/bulletins/${bulletin.file}`;
  return (
    <>
      <PageBanner title="Weekly Bulletin" />
      <section className="section">
        <div className="container narrow bulletin">
          <a className="bulletin-cover" href={href}>
            <Image src="/images/bulletin.jpg" alt="" width={353} height={479} />
          </a>
          <div>
            <p className="eyebrow">This week’s bulletin</p>
            <h2>{bulletin.date}</h2>
            <p>Catch up on the news, notices and prayer points for the week ahead.</p>
            <p>
              <a className="button" href={href}>Read the bulletin (PDF)</a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
