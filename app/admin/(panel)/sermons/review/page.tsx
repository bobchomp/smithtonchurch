import type { Metadata } from "next";
import Link from "next/link";
import YouTubePlayer from "@/components/YouTubePlayer";
import { canUse, requireTool } from "@/lib/admin-auth";
import { videoForSermons } from "@/lib/livestream-match";
import { loadLivestreams } from "@/lib/livestreams";
import { audioUrl, r2IsConfigured } from "@/lib/r2";
import { mediaSiteCutoff, sermonsToReview } from "@/lib/sermon-review";
import { formatSermonDate, serviceLabel } from "@/lib/sermon-types";
import { loadSermons } from "@/lib/sermons";
import { describeStorageError } from "@/lib/supabase";
import SermonForm from "../SermonForm";
import { lastSunday, namesByUse } from "../shared";

export const metadata: Metadata = { title: "Fill in sermon details" };

const HERE = "/admin/sermons/review/";

// Steps through the sermons the old media site can't give details for, oldest first: the video on
// the left, the details on the right. "Save and next" marks the sermon as done and moves on.
export default async function ReviewSermons({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; saved?: string; end?: string }>;
}) {
  const me = await requireTool("sermon-details");
  const params = await searchParams;
  const loaded = await Promise.all([loadSermons(), loadLivestreams()]).catch((error: Error) => error);
  if (loaded instanceof Error) {
    return (
      <>
        <h1>Fill in sermon details</h1>
        <p className="admin-error">Couldn’t load the sermons from storage. {describeStorageError(loaded)}</p>
      </>
    );
  }

  const [sermons, { streams }] = loaded;
  const queue = sermonsToReview(sermons);
  const saved = sermons.find((s) => s.id === Number(params.saved));
  const index = params.end ? -1 : Math.max(0, queue.findIndex((s) => s.id === Number(params.id)));
  const sermon = index >= 0 ? queue[index] : undefined;
  const cutoff = formatSermonDate(mediaSiteCutoff(sermons)).replace(/^\w+ /, "");

  const savedNote = saved && (
    <p className="admin-success admin-notice-spaced">
      Saved “{saved.title}”.{" "}
      {canUse(me, "sermons") && <Link href={`/admin/sermons/${saved.id}/`}>Edit it again</Link>}
    </p>
  );

  if (!sermon) {
    return (
      <>
        <h1>Fill in sermon details</h1>
        {savedNote}
        <section className="admin-panel admin-panel-narrow">
          {queue.length === 0 ? (
            <p>All done: every sermon since the old media site’s last one ({cutoff}) has been gone through.</p>
          ) : (
            <>
              <p>
                You’ve reached the end of the list. {queue.length} skipped sermon{queue.length === 1 ? " is" : "s are"} still
                to do.
              </p>
              <p className="actions">
                <Link className="button" href={HERE}>Go through the skipped ones</Link>
              </p>
            </>
          )}
        </section>
      </>
    );
  }

  const next = queue[index + 1];
  const previous = queue[index - 1];
  const video = videoForSermons([sermon], streams).get(sermon.id);
  const stream = video && "startedAt" in video ? video : undefined;
  // A blank preacher is filled in from the livestream's description (saved when the form is).
  const formSermon = !sermon.preacher && stream?.preacher ? { ...sermon, preacher: stream.preacher } : sermon;
  const listen = audioUrl(sermon.audioKey);

  return (
    <>
      <h1>Fill in sermon details</h1>
      <p className="admin-intro">
        Sermons since the old media site’s last one ({cutoff}), oldest first. Sermon {index + 1} of {queue.length} still
        to do. “Save and next” saves this one, takes it off the list and opens the next.
      </p>
      {savedNote}

      <div className="admin-review">
        <div className="admin-review-media">
          <section className="admin-panel">
            <h2>
              {formatSermonDate(sermon.date)}
              {sermon.service && ` · ${serviceLabel(sermon.service)}`}
            </h2>
            {video ? (
              <>
                <YouTubePlayer key={video.id} id={video.id} title={stream?.title ?? sermon.title} />
                <p className="admin-muted admin-review-stream">
                  {stream && <>Livestream: “{stream.title}”{stream.preacher && <> · description: “{stream.preacher}”</>} · </>}
                  <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">
                    Open on YouTube
                  </a>
                </p>
              </>
            ) : (
              <p className="admin-muted">
                {sermon.video === "none" ? "Video switched off for this sermon." : "No livestream matches this sermon’s date and service."}
              </p>
            )}
            {listen && <audio className="admin-audio" controls preload="none" src={listen} />}
          </section>
          <p className="admin-review-nav">
            {previous ? <Link href={`${HERE}?id=${previous.id}`}>← Previous</Link> : <span />}
            <Link href={next ? `${HERE}?id=${next.id}` : `${HERE}?end=1`}>Skip for now →</Link>
          </p>
        </div>
        <section className="admin-panel">
          <SermonForm
            key={sermon.id}
            sermon={formSermon}
            preachers={namesByUse(sermons, (s) => s.preacher)}
            audioReady={r2IsConfigured()}
            defaultDate={lastSunday()}
            streams={streams}
            review={{ nextHref: next ? `${HERE}?id=${next.id}&saved=${sermon.id}` : `${HERE}?end=1&saved=${sermon.id}` }}
          />
        </section>
      </div>
    </>
  );
}
