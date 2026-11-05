import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import SocialLinks from "@/components/SocialLinks";
import { site } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("/", { title: { absolute: `${site.title}, Inverness` } });

// Tells search engines who the church is, where it meets and how to get in touch.
function churchDetails() {
  const [street, town] = site.address_lines;
  const postcode = town.match(/[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i)?.[0];
  return {
    "@context": "https://schema.org",
    "@type": "Church",
    "@id": `${site.url}/#church`,
    name: site.title,
    alternateName: "Smithton & Culloden Free Church",
    description: site.description,
    slogan: site.tagline,
    url: `${site.url}/`,
    logo: `${site.url}/images/logo.png`,
    image: `${site.url}/images/hero-aerial.jpg`,
    telephone: site.phone_link,
    email: site.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: street,
      addressLocality: town.replace(/,?\s*[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, "").trim(),
      ...(postcode ? { postalCode: postcode } : {}),
      addressRegion: "Highland",
      addressCountry: "GB",
    },
    geo: { "@type": "GeoCoordinates", latitude: 57.48168, longitude: -4.14517 },
    hasMap: site.maps_link,
    sameAs: [site.social.facebook, site.social.youtube, site.social.instagram, site.social.x],
    parentOrganization: { "@type": "Organization", name: "Free Church of Scotland", url: "https://freechurch.org/" },
  };
}

const infoCards = [
  { accent: "#00bc87", title: "Drop us a line", href: "#contact", lines: [`Fill out the contact form below or call ${site.phone}`] },
  { accent: "#00bca9", title: "Find us", href: site.maps_link, lines: site.address_lines },
  { accent: "#9956a0", title: "Office hours", lines: ["Monday–Friday", "9am–5pm"] },
  { accent: "#dd972e", title: "Meet us", href: "/team/", lines: ["Ministry Team", "Support Team"] },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped, so it can't close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(churchDetails()).replace(/</g, "\\u003c") }}
      />
      <section className="hero">
        <Image
          src="/images/hero-aerial.jpg"
          alt="Aerial view of Smithton Church and the surrounding area"
          width={2400}
          height={1350}
          sizes="100vw"
          priority
        />
      </section>

      <section className="section welcome">
        <div className="container narrow">
          <h1>Welcome to Smithton Church!</h1>
          <p className="lead">You found us! We are delighted that you did.</p>
          <p>
            Whether you are looking for a spiritual home to learn more about Jesus and what it means to live for him,
            or for a place to worship while on holiday in the Highland capital, we hope you will find the information
            you need on this site.
          </p>
          <p>
            If you don’t find what you are looking for, please do <a href="#contact">get in touch</a>.
          </p>
          <p>We look forward to welcoming you to Smithton Church.</p>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container services-row">
          <div className="service-times">
            <h2>Service Times</h2>
            <dl>
              <div><dt>Morning Service</dt><dd>10:30am</dd></div>
              <div><dt>Evening Service</dt><dd>5:30pm</dd></div>
            </dl>
            <hr />
            <dl>
              <div><dt>1st, 3rd &amp; 5th Wednesday<br />Church Night</dt><dd>7:30pm</dd></div>
              <div><dt>2nd &amp; 4th Wednesday<br />Community Groups</dt><dd>7:30pm</dd></div>
            </dl>
          </div>
          <div className="watch-online">
            <h2>Watch online</h2>
            <p>Can’t make it in person? Our Sunday services are streamed live, so you can join us from wherever you are.</p>
            <div className="actions">
              <Link className="button" href="/live/">
                Watch live
              </Link>
              <Link className="button button-outline" href="/sermons/">
                Past sermons
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container info-cards">
          {infoCards.map((card, i) => {
            const body = (
              <>
                <span className="info-num">{i + 1}</span>
                <h3>{card.title}</h3>
                <p>
                  {card.lines.map((line, j) => (
                    <span key={line}>
                      {j > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </p>
              </>
            );
            const style = { "--accent": card.accent } as React.CSSProperties;
            if (!card.href) return <div className="info-card" style={style} key={card.title}>{body}</div>;
            if (card.href.startsWith("/"))
              return <Link className="info-card" style={style} href={card.href} key={card.title}>{body}</Link>;
            return <a className="info-card" style={style} href={card.href} key={card.title}>{body}</a>;
          })}
        </div>
      </section>

      <ContactForm />

      <section className="section section-tight follow">
        <div className="container">
          <h2 className="section-title">Follow us</h2>
          <SocialLinks />
        </div>
      </section>

      <section className="map">
        <iframe
          src={site.maps_embed}
          title="Map showing Smithton Church, Murray Road, Inverness"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </section>
    </>
  );
}
