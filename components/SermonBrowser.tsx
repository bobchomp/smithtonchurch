"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BIBLE_BOOKS } from "@/lib/bible";
import { formatDuration, formatSermonDate, serviceLabel, type PublicSermon } from "@/lib/sermon-types";

const PER_PAGE = 20;
const FILTERS = ["q", "preacher", "series", "book", "year", "service"] as const;
type Filters = Record<(typeof FILTERS)[number], string>;
const EMPTY: Filters = { q: "", preacher: "", series: "", book: "", year: "", service: "" };

function countBy(sermons: PublicSermon[], pick: (s: PublicSermon) => string | undefined): [string, number][] {
  const counts = new Map<string, number>();
  for (const s of sermons) {
    const value = pick(s);
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()];
}

function matches(s: PublicSermon, f: Filters): boolean {
  if (f.preacher && s.preacher !== f.preacher) return false;
  if (f.series && s.series !== f.series) return false;
  if (f.book && s.book !== f.book) return false;
  if (f.year && !s.date.startsWith(f.year)) return false;
  if (f.service && s.service !== f.service) return false;
  if (f.q) {
    const text = [s.title, s.preacher, s.series, s.passage].join(" ").toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).every((word) => text.includes(word))) return false;
  }
  return true;
}

// The searchable sermon archive. Filtering happens in the browser from the full list, so the page
// itself can stay cached; the filters are kept in the address so results can be bookmarked and shared.
export default function SermonBrowser({ sermons }: { sermons: PublicSermon[] }) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);

  // Read any filters from the address when the page loads.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = { ...EMPTY };
    for (const key of FILTERS) initial[key] = params.get(key) ?? "";
    setFilters(initial);
    setPage(Math.max(1, Number(params.get("page")) || 1));
  }, []);

  // Keep the address up to date as filters change.
  useEffect(() => {
    const params = new URLSearchParams();
    for (const key of FILTERS) if (filters[key]) params.set(key, filters[key]);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [filters, page]);

  const results = useMemo(() => sermons.filter((s) => matches(s, filters)), [sermons, filters]);
  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const shown = results.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const preachers = useMemo(() => countBy(sermons, (s) => s.preacher).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])), [sermons]);
  const seriesList = useMemo(() => countBy(sermons, (s) => s.series).sort((a, b) => a[0].localeCompare(b[0])), [sermons]);
  const books = useMemo(() => {
    const counts = new Map(countBy(sermons, (s) => s.book));
    return BIBLE_BOOKS.filter((b) => counts.has(b)).map((b) => [b, counts.get(b)!] as [string, number]);
  }, [sermons]);
  const years = useMemo(() => countBy(sermons, (s) => s.date.slice(0, 4)).sort((a, b) => b[0].localeCompare(a[0])), [sermons]);

  function set(key: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  const active = FILTERS.some((key) => filters[key]);

  return (
    <div className="sermon-browser">
      <form className="sermon-filters" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="sermon-search">
          Search
          <input type="search" value={filters.q} placeholder="Title, preacher, series or passage" onChange={(e) => set("q", e.target.value)} />
        </label>
        <label>
          Preacher
          <select value={filters.preacher} onChange={(e) => set("preacher", e.target.value)}>
            <option value="">All preachers</option>
            {preachers.map(([name, count]) => (
              <option key={name} value={name}>{`${name} (${count})`}</option>
            ))}
          </select>
        </label>
        <label>
          Series
          <select value={filters.series} onChange={(e) => set("series", e.target.value)}>
            <option value="">All series</option>
            {seriesList.map(([name, count]) => (
              <option key={name} value={name}>{`${name} (${count})`}</option>
            ))}
          </select>
        </label>
        <label>
          Bible book
          <select value={filters.book} onChange={(e) => set("book", e.target.value)}>
            <option value="">All books</option>
            {books.map(([name, count]) => (
              <option key={name} value={name}>{`${name} (${count})`}</option>
            ))}
          </select>
        </label>
        <label>
          Year
          <select value={filters.year} onChange={(e) => set("year", e.target.value)}>
            <option value="">All years</option>
            {years.map(([year, count]) => (
              <option key={year} value={year}>{`${year} (${count})`}</option>
            ))}
          </select>
        </label>
        <label>
          Service
          <select value={filters.service} onChange={(e) => set("service", e.target.value)}>
            <option value="">Morning &amp; evening</option>
            <option value="am">Morning</option>
            <option value="pm">Evening</option>
          </select>
        </label>
      </form>

      <p className="sermon-count" aria-live="polite">
        {results.length === sermons.length ? `${sermons.length} sermons` : `${results.length} of ${sermons.length} sermons`}
        {active && (
          <>
            {" · "}
            <button type="button" className="link-button" onClick={() => { setFilters(EMPTY); setPage(1); }}>
              Clear filters
            </button>
          </>
        )}
      </p>

      {shown.length === 0 ? (
        <p className="sermon-empty">No sermons match those filters.</p>
      ) : (
        <ol className="sermon-list">
          {shown.map((s) => (
            <li key={s.id} className="sermon-item">
              <div className="sermon-item-date">
                <span>{formatSermonDate(s.date).replace(/^\w+ /, "")}</span>
                {s.service && <span className="sermon-item-service">{serviceLabel(s.service)}</span>}
              </div>
              <div className="sermon-item-main">
                <h3>
                  <Link href={s.path}>{s.title}</Link>
                </h3>
                <p className="sermon-item-meta">{[s.preacher, s.passage, s.series].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="sermon-item-extra">
                {s.youtubeId && <span className="sermon-item-video">Video</span>}
                {s.audioUrl ? (
                  <span>{formatDuration(s.duration) || "Audio"}</span>
                ) : (
                  !s.youtubeId && <span className="sermon-item-noaudio">No recording</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {pages > 1 && (
        <nav className="sermon-pages" aria-label="Pages of sermons">
          <button type="button" className="button button-outline" disabled={page <= 1} onClick={() => { setPage(page - 1); window.scrollTo({ top: 0 }); }}>
            Newer
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button type="button" className="button button-outline" disabled={page >= pages} onClick={() => { setPage(page + 1); window.scrollTo({ top: 0 }); }}>
            Older
          </button>
        </nav>
      )}
    </div>
  );
}
