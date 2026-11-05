import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import PageBanner from "@/components/PageBanner";
import TeamGrid from "@/components/TeamGrid";
import { team } from "@/lib/content";

export const metadata: Metadata = pageMetadata("/team/", {
  title: "Meet The Team",
  description: "Meet the ministry team, support team, elders and deacons of Smithton Church, Inverness.",
});

export default function Team() {
  return (
    <>
      <PageBanner title="Smithton Church Team" />
      <section className="section">
        <div className="container">
          <h2 className="section-title">Ministry Team</h2>
          <TeamGrid people={team.ministry} />
        </div>
      </section>
      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title">Support Team</h2>
          <TeamGrid people={team.support} />
        </div>
      </section>
      <section className="section">
        <div className="container">
          <h2 className="section-title">Elders</h2>
          <TeamGrid people={team.elders} compact />
        </div>
      </section>
      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title">Deacons</h2>
          <TeamGrid people={team.deacons} compact />
        </div>
      </section>
    </>
  );
}
