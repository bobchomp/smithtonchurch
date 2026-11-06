// Home page design option D (C's opening, A's welcome, B's Find us), for review in Admin → Pages to
// Review. Not the live home page.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import SocialLinks from "@/components/SocialLinks";
import ThisWeek from "@/components/ThisWeek";
import { site } from "@/lib/content";
import { ICONS, icon, MapEmbed, WELCOME } from "../_shared/shared";
import "../_shared/proto.css";

export const metadata: Metadata = { title: "Home page option D (draft)", robots: { index: false, follow: false } };

export default function ProtoD() {
  return (
    <>
      <section className="pc-hero pd-hero">
        <Image src="/images/hero-aerial.jpg" alt="" fill priority sizes="100vw" className="pa-hero-img" />
        <div className="pc-hero-inner">
          <h1>Welcome to Smithton Church!</h1>
          <p>{site.tagline.replace(" - ", " – ")}</p>
        </div>
      </section>

      <section className="section">
        <div className="container pa-split">
          <div>
            <h2>You found us! We are delighted that you did.</h2>
            <p>{WELCOME[0]}</p>
            <p>We look forward to welcoming you to Smithton Church.</p>
            <p className="actions">
              <Link className="button" href="/about-us/">About us</Link>
              <Link className="button button-outline" href="/team/">Meet the team</Link>
            </p>
          </div>
          <Image className="pa-split-img" src="/images/venue/church.jpg" alt="Smithton Church from the car park" width={900} height={540} />
        </div>
      </section>

      <ThisWeek />

      <section className="section">
        <div className="container pb-contact">
          <div>
            <h2>Find us</h2>
            <ul className="pb-contact-list">
              <li>{icon(ICONS.pin, 22)}<span>{site.address_lines.join(", ")}</span></li>
              <li>{icon(ICONS.phone, 22)}<a href={`tel:${site.phone_link}`}>{site.phone}</a></li>
              <li>{icon(ICONS.mail, 22)}<a href={`mailto:${site.email}`}>{site.email}</a></li>
              <li>{icon(ICONS.clock, 22)}<span>Office: {site.office_hours}</span></li>
            </ul>
            <SocialLinks />
          </div>
          <MapEmbed height={360} />
        </div>
      </section>

      <ContactForm />
    </>
  );
}
