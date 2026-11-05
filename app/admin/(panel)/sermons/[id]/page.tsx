import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteButton from "../../_documents/DeleteButton";
import YouTubePlayer from "@/components/YouTubePlayer";
import { requireAdmin } from "@/lib/admin-auth";
import { videoForSermons } from "@/lib/livestream-match";
import { loadLivestreams } from "@/lib/livestreams";
import { audioUrl, r2IsConfigured } from "@/lib/r2";
import { formatDuration, formatSermonDate, sermonPath } from "@/lib/sermon-types";
import { loadSermons } from "@/lib/sermons";
import { deleteSermon } from "../actions";
import SermonForm from "../SermonForm";
import { lastSunday, namesByUse } from "../shared";

export const metadata: Metadata = { title: "Edit sermon" };

export default async function EditSermon({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ added?: string }>;
}) {
  await requireAdmin();
  const id = Number((await params).id);
  const added = (await searchParams).added;
  const [sermons, { streams }] = await Promise.all([loadSermons(), loadLivestreams()]);
  const sermon = sermons.find((s) => s.id === id);
  if (!sermon) notFound();
  const video = videoForSermons([sermon], streams).get(sermon.id);
  // A blank preacher is filled in from the livestream's description (saved when the form is).
  const streamPreacher = video && "preacher" in video ? video.preacher : undefined;
  const formSermon = !sermon.preacher && streamPreacher ? { ...sermon, preacher: streamPreacher } : sermon;
  const listen = audioUrl(sermon.audioKey);

  return (
    <>
      <p className="admin-breadcrumb">
        <Link href="/admin/">Dashboard</Link> / <Link href="/admin/sermons/">Sermons</Link> / Edit
      </p>
      <h1>{sermon.title}</h1>
      <p className="admin-intro">
        {formatSermonDate(sermon.date)} · <Link href={sermonPath(sermon)}>View on the website</Link>
      </p>
      {added && <p className="admin-success admin-notice-spaced">Sermon added. It’s now live on the website.</p>}

      <div className="admin-columns">
        <section className="admin-panel">
          <SermonForm
            sermon={formSermon}
            preachers={namesByUse(sermons, (s) => s.preacher)}
            audioReady={r2IsConfigured()}
            defaultDate={lastSunday()}
            streams={streams}
          />
        </section>
        <div className="admin-stack">
          <section className="admin-panel">
            <h2>Video</h2>
            {video ? (
              <>
                <YouTubePlayer key={video.id} id={video.id} title={"title" in video ? video.title : sermon.title} />
                <p className="admin-muted admin-review-stream">
                  {"title" in video && <>Livestream: “{video.title}” · </>}
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
          </section>
          <section className="admin-panel">
            <h2>Audio</h2>
            {listen ? (
              <>
                <audio className="admin-audio" controls preload="none" src={listen} />
                <p className="admin-muted">
                  {sermon.audioSize ? `${(sermon.audioSize / 1024 / 1024).toFixed(1)} MB` : ""}
                  {sermon.duration ? ` · ${formatDuration(sermon.duration)}` : ""}
                </p>
              </>
            ) : (
              <p className="admin-muted">No audio uploaded for this sermon.</p>
            )}
          </section>
          <section className="admin-panel">
            <h2>Delete</h2>
            <p className="admin-muted">Removes the sermon and its audio from the website. This can’t be undone.</p>
            <form action={deleteSermon}>
              <input type="hidden" name="id" value={sermon.id} />
              <DeleteButton question={`Delete the sermon “${sermon.title}” and its audio?`} />
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
