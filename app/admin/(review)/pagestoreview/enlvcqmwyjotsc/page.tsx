// Home page design option B, for review in Admin → Pages to Review. Not the live home page.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import SocialLinks from "@/components/SocialLinks";
import ThisWeek from "@/components/ThisWeek";
import { site } from "@/lib/content";
import { ICONS, icon, MapEmbed, WELCOME } from "../_shared/shared";
import "../_shared/proto.css";

const cards = [
  { href: "/about-us/", img: "/images/venue/auditorium.jpg", title: "Join us on Sunday", text: "Services at 10:30am and 5:30pm, with crèche and Sunday Club in the morning." },
  { href: "/live/", img: "/images/venue/stream.jpg", title: "Watch online", text: "Can’t make it in person? Join our Sunday services live." },
  { href: "/community/", img: "/images/venue/cafe.jpg", title: "Get involved", text: "Groups and activities for all ages through the week." },
];

export const metadata: Metadata = { title: "Home page option B (draft)", robots: { index: false, follow: false } };

export default function ProtoB() {
  return (
    <>
      <section className="pb-hero">
        <div className="pb-hero-text">
          <div className="pb-hero-text-inner">
            <h1>Welcome to Smithton Church!</h1>
            <p className="pb-lead">You found us! We are delighted that you did.</p>
            <dl className="pb-times">
              <div><dt>Sunday morning</dt><dd>10:30am</dd></div>
              <div><dt>Sunday evening</dt><dd>5:30pm</dd></div>
              <div><dt>Wednesday</dt><dd>7:30pm</dd></div>
            </dl>
            <div className="pb-hero-actions">
              <Link className="button pa-btn-white" href="/live/">Watch live</Link>
              <a className="button pa-btn-ghost" href={site.maps_link}>Get directions</a>
            </div>
          </div>
        </div>
        <div className="pb-hero-img">
          <Image src="/images/hero-aerial.jpg" alt="Aerial view of Smithton Church and the surrounding area" fill priority sizes="(max-width: 900px) 100vw, 55vw" />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="pb-cards">
            {cards.map((c) => (
              <Link key={c.href} href={c.href} className="pb-card">
                <Image src={c.img} alt="" width={600} height={380} />
                <span className="pb-card-body">
                  <strong>{c.title}</strong>
                  <span>{c.text}</span>
                  <span className="pb-card-more">Find out more →</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ThisWeek />

      <section className="section">
        <div className="container narrow center">
          <h2 className="section-title">A church for everyone</h2>
          <p className="pb-welcome">{WELCOME[0]}</p>
          <p className="actions" style={{ justifyContent: "center" }}>
            <Link className="button" href="/about-us/">About us</Link>
            <Link className="button button-outline" href="/team/">Meet the team</Link>
          </p>
        </div>
      </section>

      <section className="section section-alt">
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
