import Image from "next/image";
import SocialLinks from "./SocialLinks";
import { site } from "@/lib/content";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Image src="/images/logo-white.png" alt="Smithton Church" width={600} height={123} />
          <SocialLinks />
        </div>
        <div>
          <h2>Visit us</h2>
          <p>
            {site.address_lines.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
            <a href={site.maps_link}>Get directions</a>
          </p>
          <p>Sundays at 10:30am &amp; 5:30pm</p>
        </div>
        <div>
          <h2>Get in touch</h2>
          <p>
            <a href={`tel:${site.phone_link}`}>{site.phone}</a>
            <br />
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>
          <p>
            Office hours:
            <br />
            {site.office_hours}
          </p>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>&copy; {new Date().getFullYear()} Smithton Church. All rights reserved.</p>
        <p className="footer-tagline">{site.tagline}</p>
        <p className="footer-charity">
          Smithton &amp; Culloden Free Church (known as Smithton Church) is a Scottish Charity (SC012271) regulated by
          the Scottish Charity Regulator (OSCR).
        </p>
      </div>
    </footer>
  );
}
