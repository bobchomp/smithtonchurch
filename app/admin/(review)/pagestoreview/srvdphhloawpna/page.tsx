// Home page design option A, for review in Admin → Pages to Review. Not the live home page.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import ThisWeek from "@/components/ThisWeek";
import { site } from "@/lib/content";
import { ICONS, icon, MapEmbed, WELCOME } from "../_shared/shared";
import "../_shared/proto.css";

const quick = [
  { href: "/sermons/", label: "Sermons", text: "Watch & listen again", icon: ICONS.mic },
  { href: "/community/", label: "What’s On", text: "Groups through the week", icon: ICONS.calendar },
  { href: "/weekly-bulletin/", label: "Weekly Bulletin", text: "News & prayer points", icon: ICONS.doc },
  { href: "/giving/", label: "Giving", text: "Support the work", icon: ICONS.heart },
];

export const metadata: Metadata = { title: "Home page option A (draft)", robots: { index: false, follow: false } };

export default function ProtoA() {
  return (
    <>
      <section className="pa-hero">
        <Image src="/images/hero-aerial.jpg" alt="" fill priority sizes="100vw" className="pa-hero-img" />
        <div className="container pa-hero-inner">
          <p className="pa-eyebrow">Smithton, Inverness</p>
          <h1>Welcome to Smithton Church!</h1>
          <p className="pa-tagline">{site.tagline.replace(" - ", " – ")}</p>
          <p className="pa-times">{icon(ICONS.clock, 20)} Sundays at 10:30am &amp; 5:30pm</p>
          <div className="pa-hero-actions">
            <Link className="button pa-btn-white" href="/live/">Watch live</Link>
            <a className="button pa-btn-ghost" href={site.maps_link}>Find us</a>
          </div>
        </div>
      </section>

      <section className="pa-quick">
        <div className="container pa-quick-grid">
          {quick.map((q) => (
            <Link key={q.href} href={q.href} className="pa-quick-card">
              <span className="pa-quick-icon">{icon(q.icon)}</span>
              <span>
                <strong>{q.label}</strong>
                <span>{q.text}</span>
              </span>
            </Link>
          ))}
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
        <div className="container">
          <h2 className="section-title">Visit us</h2>
          <div className="pa-visit">
            <div className="pa-visit-card pa-visit-blue">
              <h3>Sunday services</h3>
              <p className="pa-big">10:30am &amp; 5:30pm</p>
              <p>Morning and evening, every Sunday.</p>
            </div>
            <div className="pa-visit-card">
              <h3>Wednesdays at 7:30pm</h3>
              <p>1st, 3rd &amp; 5th: Church Night</p>
              <p>2nd &amp; 4th: Community Groups</p>
            </div>
            <div className="pa-visit-card">
              <h3>Find us</h3>
              <p>{site.address_lines.join(", ")}</p>
              <a className="button button-outline" href={site.maps_link}>Get directions</a>
            </div>
          </div>
          <div style={{ marginTop: "1.5rem" }}><MapEmbed height={340} /></div>
        </div>
      </section>

      <ContactForm />
    </>
  );
}
