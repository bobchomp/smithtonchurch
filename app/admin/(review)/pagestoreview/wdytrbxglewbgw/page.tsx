// Home page design option C, for review in Admin → Pages to Review. Not the live home page.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import ThisWeek from "@/components/ThisWeek";
import { site } from "@/lib/content";
import { ICONS, icon, WELCOME } from "../_shared/shared";
import "../_shared/proto.css";

const explore = [
  { href: "/about-us/", img: "/images/venue/church.jpg", title: "About us" },
  { href: "/community/", img: "/images/venue/games-hall.jpg", title: "What’s On" },
  { href: "/sermons/", img: "/images/venue/auditorium.jpg", title: "Sermons" },
  { href: "/missions/", img: "/images/missions/seafarers.jpg", title: "Missions" },
  { href: "/giving/", img: "/images/venue/cafe.jpg", title: "Giving" },
  { href: "/conferencing-venue/", img: "/images/venue/small-hall.jpg", title: "Conferencing Venue" },
];

export const metadata: Metadata = { title: "Home page option C (draft)", robots: { index: false, follow: false } };

export default function ProtoC() {
  return (
    <>
      <section className="pc-hero">
        <Image src="/images/hero-aerial.jpg" alt="" fill priority sizes="100vw" className="pa-hero-img" />
        <div className="pc-hero-inner">
          <h1>Welcome to Smithton Church!</h1>
          <p>{site.tagline.replace(" - ", " – ")}</p>
        </div>
      </section>

      <section className="pc-bar">
        <div className="container pc-bar-inner">
          <span>{icon(ICONS.clock, 22)} <strong>Sundays</strong> 10:30am &amp; 5:30pm</span>
          <span className="pc-bar-sep" aria-hidden="true" />
          <span><strong>Wednesdays</strong> 7:30pm</span>
          <Link className="button pa-btn-white" href="/live/">{icon(ICONS.live, 18)} Watch live</Link>
        </div>
      </section>

      <section className="section">
        <div className="container narrow center">
          <p className="pc-lead">You found us! We are delighted that you did.</p>
          <p className="pc-welcome">{WELCOME[0]}</p>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container">
          <div className="pc-grid">
            {explore.map((e) => (
              <Link key={e.href} href={e.href} className="pc-tile">
                <Image src={e.img} alt="" fill sizes="(max-width: 700px) 50vw, 33vw" />
                <span>{e.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ThisWeek />

      <section className="section">
        <div className="container pc-contact">
          <a href={`tel:${site.phone_link}`} className="pc-contact-item">{icon(ICONS.phone)}<strong>Call us</strong><span>{site.phone}</span></a>
          <a href={`mailto:${site.email}`} className="pc-contact-item">{icon(ICONS.mail)}<strong>Email us</strong><span>{site.email}</span></a>
          <a href={site.maps_link} className="pc-contact-item">{icon(ICONS.pin)}<strong>Visit us</strong><span>{site.address_lines.join(", ")}</span></a>
        </div>
      </section>

      <ContactForm />
    </>
  );
}
