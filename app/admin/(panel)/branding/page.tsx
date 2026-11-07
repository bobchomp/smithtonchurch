/* eslint-disable @next/next/no-img-element -- logos are shown at their own size, on coloured tiles */
import type { Metadata } from "next";
import Link from "next/link";
import { requireTool } from "@/lib/admin-auth";
import { site } from "@/lib/content";
import CopyButton from "./CopyButton";

export const metadata: Metadata = { title: "Branding" };

// The church's look on the website, in one place: logos, colours, fonts, buttons and photos.
// Keep it in step with the :root colours and fonts in app/globals.css.

type Colour = { name: string; hex: string; use: string };
const COLOURS: { group: string; colours: Colour[] }[] = [
  {
    group: "Main colours",
    colours: [
      { name: "Smithton Blue", hex: "#456188", use: "The main colour: headings, buttons, links, the footer and the logo." },
      { name: "Deep Blue", hex: "#34496a", use: "Buttons and links when hovered, and the tint over photos (holding slides)." },
      { name: "Light Blue", hex: "#eef2f7", use: "Soft highlights, such as the background of tags and selected items." },
    ],
  },
  {
    group: "Neutrals",
    colours: [
      { name: "Text", hex: "#2b3440", use: "Body text." },
      { name: "Muted text", hex: "#5d6875", use: "Secondary text, such as dates and captions." },
      { name: "Light background", hex: "#f5f7fa", use: "Alternate page sections and boxes." },
      { name: "Border", hex: "#dde3ea", use: "Lines around boxes and between items." },
      { name: "White", hex: "#ffffff", use: "Page background, and text on blue." },
    ],
  },
];

// WCAG contrast ratio between two colours.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ");

function ContrastNote({ hex }: { hex: string }) {
  const onWhite = contrast(hex, "#ffffff");
  const withWhite = onWhite >= 4.5;
  const best = withWhite ? { text: "#ffffff", label: "white text", ratio: onWhite } : { text: "#2b3440", label: "dark text", ratio: contrast(hex, "#2b3440") };
  return (
    <span className="brand-contrast">
      Use {best.label} on it ({best.ratio.toFixed(1)}:1{best.ratio >= 7 ? ", excellent" : best.ratio >= 4.5 ? ", good" : ""})
    </span>
  );
}

const LOGOS = [
  { file: "/images/logo.png", name: "Smithton Church logo (blue)", note: "On white or light backgrounds. Used in the website header.", tile: "brand-tile-light" },
  { file: "/images/logo-white.png", name: "Smithton Church logo (white)", note: "On Smithton Blue or photos. Used in the footer, admin panel and holding slides.", tile: "brand-tile-blue" },
];

const FC_LOGOS = [
  { file: "FC Logo_Vertical - Color.png", note: "On the home page (“We are part of the Free Church of Scotland”).", tile: "brand-tile-light" },
  { file: "FC Logo_Horizontal - Solid White.png", note: "In the footer, under the social media icons.", tile: "brand-tile-blue" },
];

const PHOTOS = [
  { file: "/images/hero-aerial.jpg", name: "Aerial photo of Smithton", note: "Home page banner, and behind the holding slides (with a Deep Blue tint)." },
  { file: "/images/venue/church.jpg", name: "The church building", note: "Home page welcome section." },
  { file: "/images/og-image.jpg", name: "Sharing image (1200×630)", note: "Shown when a page is shared on social media or in messages." },
];

const fcPath = (file: string) => `/images/freechurch-logos/${encodeURIComponent(file)}`;

export default async function Branding() {
  await requireTool("branding");
  return (
    <>
      <h1>Branding</h1>
      <p className="admin-intro">
        The logos, colours, fonts and styles used for Smithton Church on the website, to keep anything new looking the same.
      </p>

      <div className="brand">
        <section className="admin-panel">
          <h2>Logo</h2>
          <div className="brand-logos">
            {LOGOS.map((l) => (
              <figure key={l.file}>
                <div className={`brand-tile ${l.tile}`}>
                  <img src={l.file} alt={l.name} width={300} height={62} />
                </div>
                <figcaption>
                  <strong>{l.name}</strong>
                  <span>{l.note}</span>
                  <a className="brand-download" href={l.file} download>Download PNG (600×123)</a>
                </figcaption>
              </figure>
            ))}
          </div>
          <ul className="brand-rules">
            <li>Leave clear space around the logo of at least the height of the “S”, and don’t show it smaller than 140px wide on screen.</li>
            <li>Don’t stretch, recolour, rotate or add effects to it. Use the white version on anything darker than Light Blue.</li>
            <li>The logo includes the tagline. These copies are 600px wide, which is fine for screens; for print, ask for the original artwork.</li>
          </ul>
          <div className="brand-favicon">
            <img src="/images/favicon.png" alt="" width={32} height={32} />
            <span><strong>Browser tab icon</strong> (64×64): shown in browser tabs and bookmarks.</span>
            <a className="brand-download" href="/images/favicon.png" download>Download</a>
          </div>
        </section>

        <section className="admin-panel">
          <h2>Colours</h2>
          {COLOURS.map((g) => (
            <div key={g.group} className="brand-colour-group">
              <h3>{g.group}</h3>
              <ul className="brand-swatches">
                {g.colours.map((c) => (
                  <li key={c.hex}>
                    <span className="brand-swatch" style={{ background: c.hex, color: contrast(c.hex, "#ffffff") >= 4.5 ? "#fff" : "#2b3440" }}>
                      Aa
                    </span>
                    <div>
                      <strong>{c.name}</strong>
                      <span className="brand-codes">
                        <CopyButton text={c.hex.toUpperCase()} /> <span>RGB {rgb(c.hex)}</span>
                      </span>
                      <span className="brand-use">{c.use}</span>
                      <ContrastNote hex={c.hex} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="admin-muted brand-note">
            Click a colour code to copy it. Red and green are used only for warnings and confirmations in forms and the
            admin panel, never for decoration.
          </p>
        </section>

        <section className="admin-panel">
          <h2>Fonts</h2>
          <div className="brand-fonts">
            <div>
              <p className="brand-font-name">Poppins</p>
              <p className="brand-font-use">Headings, buttons and the menu. Weights 400, 500, 600 (most headings) and 700.</p>
              <p className="brand-sample-head">Welcome to Smithton Church!</p>
              <p className="brand-weights">
                {[400, 500, 600, 700].map((w) => (
                  <span key={w} style={{ fontWeight: w }}>{w}</span>
                ))}
              </p>
              <a href="https://fonts.google.com/specimen/Poppins" target="_blank" rel="noopener noreferrer">Poppins on Google Fonts (free)</a>
            </div>
            <div>
              <p className="brand-font-name brand-font-body">Open Sans</p>
              <p className="brand-font-use">Everything else: paragraphs, lists and forms. 17px, with generous line spacing.</p>
              <p className="brand-sample-body">
                Whether you are looking for a spiritual home to learn more about Jesus and what it means to live for him, or
                for a place to worship while on holiday in the Highland capital, we hope you find what you need here.
              </p>
              <a href="https://fonts.google.com/specimen/Open+Sans" target="_blank" rel="noopener noreferrer">Open Sans on Google Fonts (free)</a>
            </div>
          </div>
        </section>

        <section className="admin-panel">
          <h2>Tagline</h2>
          <p className="brand-tagline">{site.tagline.replace(" - ", " – ")}</p>
          <p className="admin-muted">All lower case, with an en dash. Set in Poppins italic in the footer, and in capitals as part of the logo.</p>
        </section>

        <section className="admin-panel">
          <h2>Buttons and shapes</h2>
          <div className="brand-buttons">
            <span><span className="button">Main button</span><small>Main actions</small></span>
            <span><span className="button button-outline">Outline button</span><small>Second choices, beside a main button</small></span>
            <span><span className="button brand-pill">Pill button</span><small>Small actions, such as “Open the bulletin”</small></span>
            <span className="brand-on-blue"><span className="footer-button">Live Services</span><small>On blue (the footer)</small></span>
          </div>
          <ul className="brand-rules">
            <li>Corners are gently rounded: 8px on boxes and cards, 6px on buttons and pictures; pills are fully round.</li>
            <li>Boxes have a thin Border line and a soft shadow. Buttons that open another website show a small ↗ arrow before the text.</li>
          </ul>
        </section>

        <section className="admin-panel">
          <h2>Photos</h2>
          <div className="brand-photos">
            {PHOTOS.map((p) => (
              <figure key={p.file}>
                <img src={p.file} alt={p.name} loading="lazy" />
                <figcaption>
                  <strong>{p.name}</strong>
                  <span>{p.note}</span>
                  <a className="brand-download" href={p.file} download>Download</a>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="admin-muted brand-note">
            Use real photos of the church and its people. The AI-made picture of a congregation from the old website
            isn’t used anywhere. Live stream slides are in <Link href="/admin/holding-slides/">Holding Slides</Link>.
          </p>
        </section>

        <section className="admin-panel">
          <h2>Free Church of Scotland logos</h2>
          <p className="admin-muted">These belong to the Free Church of Scotland; use them as they are, to show we’re part of it.</p>
          <div className="brand-logos">
            {FC_LOGOS.map((l) => (
              <figure key={l.file}>
                <div className={`brand-tile ${l.tile}`}>
                  <img src={fcPath(l.file)} alt={l.file.replace(/\.png$/, "")} />
                </div>
                <figcaption>
                  <strong>{l.file.replace(/^FC Logo_/, "").replace(/\.png$/, "")}</strong>
                  <span>{l.note}</span>
                  <a className="brand-download" href={fcPath(l.file)} download>Download PNG</a>
                </figcaption>
              </figure>
            ))}
          </div>
          <details className="brand-more">
            <summary>The other versions we have</summary>
            <ul>
              {[
                "Horizontal - Blue", "Horizontal - Color", "Horizontal - Color for Dark BG", "Horizontal - Solid Black", "Horizontal - Transparent Black",
                "Horizontal - Transparent White", "Vertical - Blue", "Vertical - Color for Dark BG", "Vertical - Solid Black", "Vertical - Solid White",
                "Vertical - Transparent White", "Vertical - White", "Symbol - Blue", "Symbol - Color", "Symbol - Black", "Symbol - White",
              ].map((n) => (
                <li key={n}>
                  <a href={fcPath(`FC Logo_${n}.png`)} download>{n}</a>
                </li>
              ))}
            </ul>
          </details>
        </section>
      </div>
    </>
  );
}
