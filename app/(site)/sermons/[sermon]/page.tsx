import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import YouTubePlayer from "@/components/YouTubePlayer";
import { formatDuration, formatSermonDate, serviceLabel, sermonIdFromParam } from "@/lib/sermon-types";
import { getPublicSermons } from "@/lib/sermons";

// Built when first visited, then cached; refreshed when the sermon is changed in the admin panel.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

async function findSermon(param: string) {
  const id = sermonIdFromParam(param);
  const sermons = await getPublicSermons();
  return { sermon: sermons.find((s) => s.id === id), sermons };
}

export async function generateMetadata({ params }: { params: Promise<{ sermon: string }> }): Promise<Metadata> {
  const { sermon } = await findSermon((await params).sermon);
  if (!sermon) return { title: "Sermon not found" };
  return {
    title: sermon.title,
    description: `${sermon.title}${sermon.preacher ? `, preached by ${sermon.preacher}` : ""} at Smithton Church on ${formatSermonDate(sermon.date)}.`,
  };
}

export default async function SermonPage({ params }: { params: Promise<{ sermon: string }> }) {
  const param = (await params).sermon;
  const { sermon } = await findSermon(param);
  if (!sermon) notFound();
  // Send old or mistyped titles in the address to the right one.
  if (`/sermons/${param}/` !== sermon.path) permanentRedirect(sermon.path);

  return (
    <>
      <section className="page-banner sermon-banner">
        <div className="container narrow">
          <p className="sermon-banner-date">
            {formatSermonDate(sermon.date)}
            {sermon.service && ` · ${serviceLabel(sermon.service)} service`}
          </p>
          <h1>{sermon.title}</h1>
        </div>
      </section>

      <section className="section">
        <div className="container narrow">
          <dl className="sermon-details">
            {sermon.preacher && (
              <div>
                <dt>Preacher</dt>
                <dd>
                  <Link href={`/sermons/?preacher=${encodeURIComponent(sermon.preacher)}`}>{sermon.preacher}</Link>
                </dd>
              </div>
            )}
            {sermon.books.length > 0 && (
              <div>
                <dt>{sermon.books.length === 1 ? "Bible book" : "Bible books"}</dt>
                <dd>
                  {sermon.books.map((book, i) => (
                    <span key={book}>
                      {i > 0 && ", "}
                      <Link href={`/sermons/?book=${encodeURIComponent(book)}`}>{book}</Link>
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {sermon.duration ? (
              <div>
                <dt>Length</dt>
                <dd>{formatDuration(sermon.duration)}</dd>
              </div>
            ) : null}
          </dl>

          {sermon.youtubeId && <YouTubePlayer id={sermon.youtubeId} title={sermon.title} />}

          {sermon.audioUrl ? (
            <div className="sermon-player">
              {sermon.youtubeId && <h2 className="sermon-audio-heading">Listen to the audio</h2>}
              <audio controls preload="metadata" src={sermon.audioUrl}>
                <a href={sermon.audioUrl}>Download the sermon audio</a>
              </audio>
              <div className="sermon-actions">
                <a className="button button-outline" href={sermon.audioUrl} download>
                  Download MP3
                </a>
              </div>
            </div>
          ) : (
            !sermon.youtubeId && <p className="sermon-empty">A recording of this sermon isn’t available.</p>
          )}

          <p className="sermon-back">
            <Link href="/sermons/">← All sermons</Link>
          </p>
        </div>
      </section>
    </>
  );
}
