import Image from "next/image";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import SocialLinks from "@/components/SocialLinks";
import { site } from "@/lib/content";

const infoCards = [
  { accent: "#00bc87", title: "Drop us a line", href: "#contact", lines: [`Fill out the contact form below or call ${site.phone}`] },
  { accent: "#00bca9", title: "Find us", href: site.maps_link, lines: site.address_lines },
  { accent: "#9956a0", title: "Office hours", lines: ["Monday–Friday", "9am–5pm"] },
  { accent: "#dd972e", title: "Meet us", href: "/team/", lines: ["Ministry Team", "Support Team"] },
];

export default function Home() {
  return (
    <>
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
          <h1>Welcome to Smithton Church</h1>
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
              <div><dt>2nd &amp; 4th Wednesday<br />Community Groups</dt></div>
            </dl>
          </div>
          <div className="livestream">
            <iframe
              src={site.livestream_embed}
              title="Smithton Church live stream"
              allow="autoplay; fullscreen"
              allowFullScreen
              loading="lazy"
            />
            <p>
              Can’t make it in person? Watch the service live here, or catch up on past{" "}
              <a href={site.social.sermons}>sermons on YouTube</a>.
            </p>
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
