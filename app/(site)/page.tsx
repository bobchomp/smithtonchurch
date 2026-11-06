import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import ExternalIcon from "@/components/ExternalIcon";
import SocialLinks from "@/components/SocialLinks";
import ThisWeek from "@/components/ThisWeek";
import { site } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

// Refreshed when a sermon or bulletin changes in the admin panel, and hourly as a fallback.
export const revalidate = 3600;

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

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  pin: "M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped, so it can't close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(churchDetails()).replace(/</g, "\\u003c") }}
      />

      <section className="home-hero">
        <Image
          src="/images/hero-aerial.jpg"
          alt="Aerial view of Smithton Church and the surrounding area"
          fill
          priority
          sizes="100vw"
        />
        <div className="home-hero-inner">
          <h1>Welcome to Smithton Church!</h1>
          <p>{site.tagline.replace(" - ", " – ")}</p>
        </div>
      </section>

      <section className="section">
        <div className="container home-welcome">
          <div>
            <h2>You found us! We are delighted that you did.</h2>
            <p>
              Whether you are looking for a spiritual home to learn more about Jesus and what it means to live for him,
              or for a place to worship while on holiday in the Highland capital, we hope you will find the information
              you need on this site.
            </p>
            <p>We look forward to welcoming you to Smithton Church.</p>
            <p className="actions">
              <Link className="button" href="/about-us/">About us</Link>
              <Link className="button button-outline" href="/team/">Meet the team</Link>
            </p>
          </div>
          <Image
            className="home-welcome-img"
            src="/images/venue/church.jpg"
            alt="Smithton Church from the car park"
            width={900}
            height={540}
            sizes="(max-width: 900px) 100vw, 540px"
          />
        </div>
      </section>

      <ThisWeek />

      <section className="section">
        <div className="container home-find">
          <div>
            <h2>Find us</h2>
            <ul className="home-find-list">
              <li>{icon(ICONS.pin)}<span>{site.address_lines.join(", ")}</span></li>
              <li>{icon(ICONS.phone)}<a href={`tel:${site.phone_link}`}>{site.phone}</a></li>
              <li>{icon(ICONS.mail)}<a href={`mailto:${site.email}`}>{site.email}</a></li>
              <li>{icon(ICONS.clock)}<span>Office: {site.office_hours}</span></li>
            </ul>
            <SocialLinks />
          </div>
          <iframe
            className="home-map"
            src={site.maps_embed}
            title="Map showing Smithton Church, Murray Road, Inverness"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <section className="section section-alt">
        <div className="container home-freechurch">
          <Image
            src="/images/freechurch-logos/FC%20Logo_Vertical%20-%20Color.png"
            alt="Free Church of Scotland"
            width={1500}
            height={958}
          />
          <div>
            <h2>We are part of the Free Church of Scotland</h2>
            <p>
              Smithton Church, known formally as Smithton &amp; Culloden Free Church, is a congregation of the Free Church
              of Scotland, a denomination of churches across Scotland and beyond.
            </p>
            <p className="actions">
              <Link className="button" href="/about-us/#what-we-believe">What we believe</Link>
              <a className="button button-outline" href="https://freechurch.org/" target="_blank" rel="noopener noreferrer">
                <ExternalIcon />
                Free Church of Scotland
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </p>
          </div>
        </div>
      </section>

      <ContactForm />
    </>
  );
}
