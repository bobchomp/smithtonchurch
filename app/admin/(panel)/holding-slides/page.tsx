/* eslint-disable @next/next/no-img-element -- the images are served to signed-in admins only, so not through next/image */
import type { Metadata } from "next";
import { requireTool } from "@/lib/admin-auth";
import { HOLDING_SLIDES, HOLDING_VIDEOS, slideFileUrl, type HoldingSlide, type SlideRevision } from "@/lib/holding-slides";

export const metadata: Metadata = { title: "Holding Slides" };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function when(date: string): string {
  const [d, t] = date.split("T");
  const [y, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS[m - 1]} ${y}, ${t}`;
}

function Images({ slide, revision, size }: { slide: HoldingSlide; revision: SlideRevision; size: "large" | "small" }) {
  return (
    <div className={`slides-images slides-images-${size}`}>
      {revision.files.map((f) => (
        <figure key={f.file}>
          <a href={slideFileUrl(slide.key, f.file, "png")} target="_blank" rel="noopener">
            <img src={slideFileUrl(slide.key, f.file, "jpg")} alt={`${slide.title}, version ${revision.version}${f.label ? ` (${f.label})` : ""}`} width={960} height={540} loading="lazy" />
          </a>
          <figcaption>
            {f.label && <span>{f.label}</span>}
            <a className={size === "large" ? "button" : "slides-download"} href={`${slideFileUrl(slide.key, f.file, "png")}?download=1`} download>
              Download PNG
            </a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export default async function HoldingSlides() {
  await requireTool("holding-slides");
  return (
    <>
      <h1>Holding Slides</h1>
      <p className="admin-intro">
        The slides shown in the live stream player before and after services, with every earlier version. Each is
        1920×1080; download the PNG to use it in the streaming software, or click a picture to see it full size.
      </p>
      <div className="slides-list">
        {HOLDING_VIDEOS.map((video) => (
          <section key={video.key} className="admin-panel slides-slide">
            <div className="slides-head">
              <h2>{video.title}</h2>
              <span className="admin-badge admin-status-showing">Video · version {video.version} (current)</span>
            </div>
            <p className="admin-muted slides-use">{video.use}</p>
            <video className="slides-video" controls preload="none" poster={video.poster} width={1920} height={1080}>
              <source src={video.file} type="video/mp4" />
            </video>
            <p className="slides-video-actions">
              <a className="button" href={video.file} download>Download MP4</a>
            </p>
            <p className="slides-changes">
              <strong>{when(video.date)}:</strong> {video.details}
            </p>
            {video.verses && (
              <details className="slides-history">
                <summary>The verses, in order ({video.verses.length})</summary>
                <ol className="slides-verses">
                  {video.verses.map((v, i) => (
                    <li key={v.ref}>
                      <span className="slides-verse-time">{Math.floor((i * 20) / 60)}:{String((i * 20) % 60).padStart(2, "0")}</span>
                      <span>
                        {v.text.split(/\{([^}]+)\}/).map((part, j) => (j % 2 ? <span key={j} className="slides-small-caps">{part}</span> : part))}{" "}
                        <strong>{v.ref}</strong>
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </section>
        ))}
        {HOLDING_SLIDES.map((slide) => {
          const current = slide.revisions[slide.revisions.length - 1];
          const past = slide.revisions.slice(0, -1).reverse();
          return (
            <section key={slide.key} className="admin-panel slides-slide">
              <div className="slides-head">
                <h2>{slide.title}</h2>
                <span className="admin-badge admin-status-showing">Version {current.version} (current)</span>
              </div>
              <p className="admin-muted slides-use">{slide.use}</p>
              <Images slide={slide} revision={current} size="large" />
              <p className="slides-changes">
                <strong>{when(current.date)}:</strong> {current.changes}
              </p>
              {past.length > 0 && (
                <details className="slides-history">
                  <summary>Earlier versions ({past.length})</summary>
                  <ol className="slides-revisions">
                    {past.map((r) => (
                      <li key={r.version}>
                        <Images slide={slide} revision={r} size="small" />
                        <div>
                          <p className="slides-version">Version {r.version} · {when(r.date)}</p>
                          <p className="slides-changes">{r.changes}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
