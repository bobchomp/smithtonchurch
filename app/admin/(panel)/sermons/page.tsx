import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { r2IsConfigured } from "@/lib/r2";
import { formatDuration, formatSermonDate, serviceLabel, type Sermon } from "@/lib/sermon-types";
import { loadSermons } from "@/lib/sermons";
import { describeStorageError, supabaseIsConfigured } from "@/lib/supabase";

export const metadata: Metadata = { title: "Sermons" };

const SHOWN = 30;

function matches(sermon: Sermon, query: string): boolean {
  const text = [sermon.title, sermon.preacher, sermon.series, sermon.passage, sermon.date].join(" ").toLowerCase();
  return query.toLowerCase().split(/\s+/).every((word) => text.includes(word));
}

export default async function SermonsAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const query = ((await searchParams).q ?? "").trim();
  const storageReady = supabaseIsConfigured();
  const audioReady = r2IsConfigured();
  const sermons = storageReady ? await loadSermons().catch((error: Error) => error) : [];
  const list = sermons instanceof Error ? [] : query ? sermons.filter((s) => matches(s, query)) : sermons;

  return (
    <>
      <p className="admin-breadcrumb">
        <Link href="/admin/">Dashboard</Link> / Sermons
      </p>
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
          <input id="sermon-search" type="search" name="q" defaultValue={query} placeholder="Search title, preacher, series, passage or date" />
          <button className="button button-outline" type="submit">Search</button>
        </form>
      </div>

      <section className="admin-panel">
        {sermons instanceof Error ? (
          <p className="admin-error">Couldn’t load the sermons from storage. {describeStorageError(sermons)}</p>
        ) : list.length === 0 ? (
          <p className="admin-muted">{query ? `No sermons match “${query}”.` : "No sermons have been added yet."}</p>
        ) : (
          <>
            <p className="admin-muted">
              {query ? `${list.length} match${list.length === 1 ? "" : "es"}` : "Most recent"}
              {list.length > SHOWN && `, showing the first ${SHOWN}`}
            </p>
            <ul className="admin-list">
              {list.slice(0, SHOWN).map((s) => (
                <li key={s.id}>
                  <div className="admin-list-item admin-sermon-row">
                    <Link href={`/admin/sermons/${s.id}/`}>{s.title}</Link>
                    <span className="admin-muted">
                      {formatSermonDate(s.date)}
                      {s.service && ` (${serviceLabel(s.service).toLowerCase()})`} · {s.preacher}
                      {s.duration ? ` · ${formatDuration(s.duration)}` : ""}
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
    </>
  );
}
