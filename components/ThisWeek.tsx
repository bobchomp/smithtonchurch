import Link from "next/link";
import { getPublicDocuments } from "@/lib/documents";
import { formatSermonDate } from "@/lib/sermon-types";
import { getPublicSermons } from "@/lib/sermons";

// "This week at Smithton" on the home page: the latest sermon and this week's bulletin, linking to
// their pages (no player or PDF here). Updates itself as sermons and bulletins are added.
export default async function ThisWeek() {
  const [sermons, { current }] = await Promise.all([getPublicSermons(), getPublicDocuments("bulletin")]);
  const sermon = sermons[0];
  const bulletin = current.date ? current : undefined;
  if (!sermon && !bulletin) return null;

  return (
    <section className="section this-week">
      <div className="container">
        <h2 className="section-title">This week at Smithton</h2>
        <div className={`this-week-cards${sermon && bulletin ? "" : " this-week-cards-single"}`}>
          {sermon && (
            <Link className="this-week-card" href={sermon.path}>
              <span className="this-week-media this-week-video">
                {sermon.youtubeId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`https://i.ytimg.com/vi/${sermon.youtubeId}/hqdefault.jpg`} alt="" loading="lazy" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="this-week-logo" src="/images/logo-white.png" alt="" loading="lazy" />
                )}
              </span>
              <span className="this-week-body">
                <span className="this-week-eyebrow">Latest sermon</span>
                <span className="this-week-title">{sermon.title}</span>
                <span className="this-week-meta">
                  {[sermon.preacher, formatSermonDate(sermon.date).replace(/^\w+ /, "")].filter(Boolean).join(" · ")}
                </span>
                <span className="button this-week-button">{sermon.youtubeId ? "Watch & listen" : "Listen"}</span>
              </span>
            </Link>
          )}
          {bulletin && (
            <Link className="this-week-card" href="/weekly-bulletin/">
              <span className="this-week-media this-week-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bulletin.coverUrl ?? "/images/bulletin.jpg"} alt="" loading="lazy" />
              </span>
              <span className="this-week-body">
                <span className="this-week-eyebrow">This week’s bulletin</span>
                <span className="this-week-title">{bulletin.label}</span>
                <span className="this-week-meta">News, notices and prayer points</span>
                <span className="button this-week-button">Open the bulletin</span>
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
