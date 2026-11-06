import type { Metadata } from "next";
import Link from "next/link";
import { canUse, requireTool } from "@/lib/admin-auth";
import { unmatchedStreams } from "@/lib/livestream-match";
import { loadLivestreams } from "@/lib/livestreams";
import { youtubeIsConfigured } from "@/lib/youtube";
import { r2IsConfigured } from "@/lib/r2";
import { formatDuration, formatSermonDate, sermonBooks, serviceLabel, type Sermon } from "@/lib/sermon-types";
import { sermonsToReview } from "@/lib/sermon-review";
import { loadSermons } from "@/lib/sermons";
import { describeStorageError, supabaseIsConfigured } from "@/lib/supabase";
import SyncButton from "./SyncButton";
import UnmatchedStreams from "./UnmatchedStreams";

export const metadata: Metadata = { title: "Sermons" };

const SHOWN = 30;

function matches(sermon: Sermon, query: string): boolean {
  const text = [sermon.title, sermon.preacher, ...sermonBooks(sermon), sermon.date].join(" ").toLowerCase();
  return query.toLowerCase().split(/\s+/).every((word) => text.includes(word));
}

export default async function SermonsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; missing?: string }> }) {
  const me = await requireTool("sermons");
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const missingBook = params.missing === "book";
  const storageReady = supabaseIsConfigured();
  const audioReady = r2IsConfigured();
  const sermons = storageReady ? await loadSermons().catch((error: Error) => error) : [];
  const toReview = sermons instanceof Error ? [] : sermonsToReview(sermons);
  const withoutBook = sermons instanceof Error ? [] : sermons.filter((s) => !sermonBooks(s).length);
  const list =
    sermons instanceof Error
      ? []
      : (missingBook ? withoutBook : sermons).filter((s) => !query || matches(s, query));
  const youtubeReady = youtubeIsConfigured();
  const livestreams = await loadLivestreams();
  const unmatched = sermons instanceof Error ? [] : unmatchedStreams(sermons, livestreams.streams);

  return (
    <>
      <h1>Sermons</h1>
      <p className="admin-intro">
        {sermons instanceof Error ? "" : `${sermons.length} sermon${sermons.length === 1 ? "" : "s"} on the website. `}
        <Link href="/sermons/">View the Sermons page</Link>
      </p>

      {(!storageReady || !audioReady) && (
        <div className="admin-notice admin-notice-spaced">
          {!storageReady && (
            <p>
              <strong>Supabase isn’t connected</strong>, so sermons can’t be saved yet.
            </p>
          )}
          {!audioReady && (
            <p>
              <strong>Audio storage (Cloudflare R2) isn’t set up yet.</strong> Sermon details can be added, but audio can’t
              be uploaded until <code>R2_ACCOUNT_ID</code>, <code>R2_ACCESS_KEY_ID</code>, <code>R2_SECRET_ACCESS_KEY</code>,{" "}
              <code>R2_BUCKET</code> and <code>R2_PUBLIC_URL</code> are added in Vercel. See the README.
            </p>
          )}
        </div>
      )}

      <div className="admin-toolbar">
        {storageReady && (
          <Link className="button" href="/admin/sermons/new/">Add a sermon</Link>
        )}
        <form className="admin-find" method="get">
          <label className="visually-hidden" htmlFor="sermon-search">Search sermons</label>
          <input id="sermon-search" type="search" name="q" defaultValue={query} placeholder="Search title, preacher, book or date" />
          {missingBook && <input type="hidden" name="missing" value="book" />}
          <button className="button button-outline" type="submit">Search</button>
        </form>
      </div>
      {toReview.length > 0 && canUse(me, "sermon-details") && (
        <p className="admin-notice admin-notice-spaced">
          {toReview.length} sermon{toReview.length === 1 ? "" : "s"} since the old media site need{toReview.length === 1 ? "s" : ""} their
          details filling in. <Link href="/admin/sermons/review/">Fill in details</Link>
        </p>
      )}
      {withoutBook.length > 0 && (
        <p className="admin-filter-links">
          {missingBook ? (
            <>
              Showing the {withoutBook.length} sermons without a Bible book. <Link href="/admin/sermons/">Show all sermons</Link>
            </>
          ) : (
            <Link href="/admin/sermons/?missing=book">{withoutBook.length} sermons don’t have a Bible book yet</Link>
          )}
        </p>
      )}

      <section className="admin-panel">
        {sermons instanceof Error ? (
          <p className="admin-error">Couldn’t load the sermons from storage. {describeStorageError(sermons)}</p>
        ) : list.length === 0 ? (
          <p className="admin-muted">
            {query ? `No sermons match “${query}”.` : missingBook ? "Every sermon has a Bible book." : "No sermons have been added yet."}
          </p>
        ) : (
          <>
            <p className="admin-muted">
              {query ? `${list.length} match${list.length === 1 ? "" : "es"}` : missingBook ? "Without a Bible book, most recent first" : "Most recent"}
              {list.length > SHOWN && `, showing the first ${SHOWN}`}
            </p>
            <ul className="admin-list">
              {list.slice(0, SHOWN).map((s) => (
                <li key={s.id}>
                  <div className="admin-list-item admin-sermon-row">
                    <Link href={`/admin/sermons/${s.id}/`}>{s.title}</Link>
                    <span className="admin-muted">
                      {formatSermonDate(s.date)}
                      {s.service && ` (${serviceLabel(s.service).toLowerCase()})`}
                      {s.preacher ? ` · ${s.preacher}` : " · no preacher"}
                      {s.duration ? ` · ${formatDuration(s.duration)}` : ""}
                      {sermonBooks(s).length ? ` · ${sermonBooks(s).join(", ")}` : " · no Bible book"}
                      {!s.audioKey && " · no audio"}
                    </span>
                  </div>
                  <Link href={`/admin/sermons/${s.id}/`}>Edit</Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="admin-panel admin-livestreams">
        <h2>YouTube livestreams</h2>
        {youtubeReady ? (
          <>
            <p className="admin-muted">
              Past livestreams are matched to sermons by date and service (before 2pm counts as the morning). The list is
              checked once a day.
              {livestreams.syncedAt &&
                ` Last checked ${new Date(livestreams.syncedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" })}: ${livestreams.streams.length} livestreams.`}
            </p>
            <SyncButton />
            {unmatched.length > 0 && (
              <UnmatchedStreams streams={unmatched} />
            )}
          </>
        ) : (
          <div className="admin-notice">
            <p>
              <strong>YouTube isn’t connected yet.</strong> Add <code>YOUTUBE_API_KEY</code> (and <code>CRON_SECRET</code>{" "}
              for the daily check) in Vercel. See the README.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
