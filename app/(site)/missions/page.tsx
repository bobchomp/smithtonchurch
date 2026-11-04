import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageBanner from "@/components/PageBanner";
import { isExternal, missions, site, slugify } from "@/lib/content";
import { Markdown } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "Missions",
  description:
    "The mission partners supported by Smithton Church, Inverness, at home and around the world, and how to pray for them.",
};

export default function Missions() {
  return (
    <>
      <PageBanner title="Missions Outreach" />
      <section className="section">
        <div className="container mission-intro">
          <div className="prose">
            <h2>A message from our Missions Committee</h2>
            <p>
              At Smithton Church, we are privileged to support various individuals, couples, and organisations involved
              in mission work both locally and globally. Our committee meets regularly to distribute funds, update the
              congregation, and foster prayerful interest in our mission partners.
            </p>
            <p>
              For more information on how you can show your support, please view the full list of our partners’ prayer
              points below or speak to any committee member.
            </p>
            <p>
              Blessings,
              <br />
              The Missions Committee
            </p>
          </div>
          <figure>
            <Image
              src="/images/missions/committee.jpg"
              alt="The Smithton Church Mission Committee"
              width={1000}
              height={750}
              sizes="(max-width: 800px) 100vw, 540px"
              style={{ height: "auto" }}
            />
            <figcaption>
              <strong>Smithton Church Mission Committee (February 2026).</strong> Left to right: David Williams, Elaine
              McRury, Geoff Hulks, Catherine Graham, Elizabeth Barnie, Ewen Macdonald, Iain Meredith, George Gray.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="section section-alt section-tight">
        <div className="container">
          <h2 className="section-title">Our mission partners</h2>
          <nav className="partner-links" aria-label="Mission partners">
            {missions.map((partner) => (
              <a key={partner.name} href={`#${slugify(partner.name)}`}>{partner.name}</a>
            ))}
          </nav>
        </div>
      </section>

      {missions.map((partner, i) => (
        <section className={`section partner${i % 2 ? " section-alt" : ""}`} id={slugify(partner.name)} key={partner.name}>
          <div className="container partner-inner">
            {partner.image && (
              <Image
                className="partner-image"
                src={`/images/missions/${partner.image}`}
                alt=""
                width={1000}
                height={1000}
                sizes="(max-width: 800px) 360px, 320px"
                style={{ height: "auto" }}
              />
            )}
            <div className="prose">
              <h2>{partner.name}</h2>
              {partner.subtitle && <p className="eyebrow">{partner.subtitle}</p>}
              {partner.description && <Markdown text={partner.description} />}
              {partner.prayer && (
                <div className="prayer">
                  <h3>Please pray</h3>
                  <ul>
                    {partner.prayer.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(partner.button || partner.links) && (
                <div className="partner-actions">
                  {partner.button && (
                    <Link className="button" href={partner.button.url}>{partner.button.title}</Link>
                  )}
                  {/* Videos and websites elsewhere open in a new tab. */}
                  {partner.links?.map((link) =>
                    isExternal(link.url) ? (
                      <a key={link.url} className="button" href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.title}
                        <span className="visually-hidden"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <a key={link.url} className="button" href={link.url}>{link.title}</a>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      ))}

      <section className="section section-tight">
        <div className="container narrow center prose">
          <h2>We’d love to hear from you</h2>
          <p>
            Please contact any of the members of the committee or the <a href={`mailto:${site.email}`}>church office</a>{" "}
            if you would like any further information about any of our mission partners.
          </p>
        </div>
      </section>
    </>
  );
}
