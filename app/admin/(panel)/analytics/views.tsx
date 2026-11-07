import Link from "next/link";
import type {
  BreakdownRow,
  ClickRow,
  FlowRow,
  MissingRow,
  Overview,
  PageRow,
  Range,
  SearchRow,
  SeriesPoint,
  SermonPlays,
  SermonRow,
  VisitRow,
} from "@/lib/analytics";
import { setTracking } from "./actions";
import Chart from "./Chart";
import { analyticsHref, csvHref, duration, MoreLink, nf, percent, Report, Stat, ukDateTime, type Column } from "./parts";
import { bucketKey, buckets, RANGES, type RangeKey } from "./ranges";

// The report pages of Admin → Analytics (chosen with the tabs at the top).

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function change(now: number | null, before: number | null, lowerIsBetter = false) {
  if (now === null || before === null || before === 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="analytics-change">no change</span>;
  const good = lowerIsBetter ? pct < 0 : pct > 0;
  return <span className={`analytics-change ${good ? "is-up" : "is-down"}`}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%</span>;
}

function Breakdown({ title, rows, range, csv, col = "Visitors", unit = "visitors", empty }: {
  title: string; rows: BreakdownRow[]; range: RangeKey; csv: string; col?: string; unit?: "visitors" | "pageviews"; empty?: string;
}) {
  return (
    <Report
      title={title}
      rows={rows}
      range={range}
      csv={csv}
      empty={empty}
      bar={(r) => r[unit]}
      rowKey={(r) => r.label}
      columns={[
        { head: "", cell: (r) => r.label },
        { head: col, cell: (r) => nf.format(r[unit]) },
      ]}
    />
  );
}

const pageColumns: Column<PageRow>[] = [
  { head: "Page", cell: (p) => p.path },
  { head: "Views", cell: (p) => nf.format(p.pageviews) },
  { head: "Visitors", cell: (p) => nf.format(p.visitors) },
  { head: "Time on page", cell: (p) => duration(p.avg_seconds) },
  { head: "Scrolled", cell: (p) => (p.avg_scroll === null ? "–" : `${Math.round(p.avg_scroll)}%`) },
  { head: "Entries", cell: (p) => nf.format(p.entries) },
  { head: "Exits", cell: (p) => nf.format(p.exits) },
];

// ---------- Overview ----------

export function OverviewView({ range, current, data, enabled, isOwner }: {
  range: RangeKey;
  current: Range;
  data: {
    now: Overview; before: Overview; chart: SeriesPoint[]; top: PageRow[];
    sources: BreakdownRow[]; campaigns: BreakdownRow[]; countries: BreakdownRow[]; cities: BreakdownRow[];
    devices: BreakdownRow[]; browsers: BreakdownRow[]; systems: BreakdownRow[]; screens: BreakdownRow[];
    storage: { bytes: number; events: number; since: string | null };
  };
  enabled: boolean;
  isOwner: boolean;
}) {
  const { now, before, chart, top, storage } = data;
  const byBucket = new Map(chart.map((p) => [bucketKey(p.bucket, current.unit), p]));
  const points = buckets(current).map((b) => ({ label: b.label, pageviews: byBucket.get(b.key)?.pageviews ?? 0, visitors: byBucket.get(b.key)?.visitors ?? 0 }));
  const comparedWith = range === "today" ? "yesterday" : "the previous " + RANGES.find((r) => r.key === range)!.label.toLowerCase();

  return (
    <>
      {!enabled && (
        <div className="admin-notice admin-notice-spaced">
          <p>
            <strong>Tracking is switched off</strong>, so nothing new is being recorded
            {isOwner ? ". Switch it on below once the privacy notice is published." : ". An owner can switch it on."}
          </p>
        </div>
      )}

      <div className="analytics-stats">
        <Stat label="Visitors" value={nf.format(now.visitors)} delta={change(now.visitors, before.visitors)} />
        <Stat label="Visits" value={nf.format(now.sessions)} delta={change(now.sessions, before.sessions)} />
        <Stat label="Page views" value={nf.format(now.pageviews)} delta={change(now.pageviews, before.pageviews)} />
        <Stat
          label="Bounce rate"
          value={now.bounce_rate === null ? "–" : `${Math.round(now.bounce_rate)}%`}
          delta={change(now.bounce_rate, before.bounce_rate, true)}
        />
        <Stat label="Average visit" value={duration(now.avg_visit_seconds)} delta={change(now.avg_visit_seconds, before.avg_visit_seconds)} />
      </div>
      <p className="analytics-compare">Changes are compared with {comparedWith}. A “bounce” is a visit that only looked at one page.</p>

      <section className="admin-panel">
        <Chart points={points} />
      </section>

      <div className="analytics-section">
        <Report title="Top pages" rows={top} range={range} csv="pages" bar={(p) => p.pageviews} rowKey={(p) => p.path} columns={pageColumns} wide />
        {top.length > 0 && <MoreLink href={analyticsHref("pages", range)}>All pages, routes through the website and individual visits →</MoreLink>}
      </div>

      <div className="analytics-grid">
        <Breakdown title="Where visitors came from" rows={data.sources} range={range} csv="sources" col="Visits" unit="pageviews" />
        <Breakdown title="Campaigns" rows={data.campaigns} range={range} csv="campaigns" col="Visits" unit="pageviews" empty="No campaign links used yet (links with ?utm_campaign=…)." />
        <Breakdown title="Countries" rows={data.countries} range={range} csv="countries" />
        <Breakdown title="Towns and cities" rows={data.cities} range={range} csv="cities" />
        <Breakdown title="Devices" rows={data.devices.map((r) => ({ ...r, label: capital(r.label) }))} range={range} csv="devices" />
        <Breakdown title="Screen sizes" rows={data.screens} range={range} csv="screens" />
        <Breakdown title="Browsers" rows={data.browsers} range={range} csv="browsers" />
        <Breakdown title="Operating systems" rows={data.systems} range={range} csv="os" />
      </div>

      <div className="admin-columns analytics-section">
        <section className="admin-panel">
          <h2>Tracking</h2>
          {isOwner ? (
            <form action={setTracking} className="admin-form analytics-tracking">
              <label className="admin-checkbox">
                <input type="checkbox" name="enabled" defaultChecked={enabled} />
                Record visits to the website (shows the cookie card to visitors)
              </label>
              <button className="button" type="submit">Save</button>
            </form>
          ) : (
            <p className="admin-muted">Tracking is {enabled ? "on" : "off"}. Owners can change this.</p>
          )}
        </section>
        <section className="admin-panel">
          <h2>Data</h2>
          <p className="admin-muted">
            {nf.format(storage.events)} events recorded
            {storage.since ? ` since ${new Date(storage.since).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""},
            using {(storage.bytes / 1024 / 1024).toFixed(1)} MB of the database (the free Supabase plan includes 500 MB).
          </p>
          <p className="analytics-download">
            <a className="button button-outline" href={csvHref("events", range)} download>
              Download every event in this period (CSV)
            </a>
          </p>
        </section>
      </div>
    </>
  );
}

// ---------- Pages & journeys ----------

export function PagesView({ range, pages, chosen, flow, journeys, visits, offset }: {
  range: RangeKey; pages: PageRow[]; chosen?: string; flow: FlowRow[];
  journeys: { journey: string; visits: number; visitors: number }[]; visits: VisitRow[]; offset: number;
}) {
  const came = flow.filter((f) => f.direction === "from");
  const went = flow.filter((f) => f.direction === "to");
  const flowColumns: Column<FlowRow>[] = [
    { head: "", cell: (f) => f.label },
    { head: "Visits", cell: (f) => nf.format(f.visits) },
  ];
  return (
    <>
      <Report
        title="Pages"
        rows={pages}
        range={range}
        csv="pages"
        bar={(p) => p.pageviews}
        rowKey={(p) => p.path}
        wide
        note="Time on page and scroll depth are averages. Entries: visits that started on the page. Exits: visits that ended there."
        columns={[{ head: "Page", cell: (p) => <Link href={analyticsHref("pages", range, { page: p.path }) + "#flow"}>{p.path}</Link> }, ...pageColumns.slice(1)]}
      />

      {chosen && (
        <section id="flow" className="admin-panel analytics-section analytics-flow">
          <div className="analytics-table-head">
            <h2>Before and after a page</h2>
          </div>
          <form className="analytics-flow-pick" action="/admin/analytics/" method="get">
            <input type="hidden" name="view" value="pages" />
            {range !== "30d" && <input type="hidden" name="range" value={range} />}
            <label>
              Page
              <select name="page" defaultValue={chosen}>
                {(pages.some((p) => p.path === chosen) ? pages : [{ path: chosen } as PageRow, ...pages]).map((p) => (
                  <option key={p.path} value={p.path}>{p.path}</option>
                ))}
              </select>
            </label>
            <button className="button" type="submit">Show</button>
          </form>
          <div className="analytics-grid analytics-flow-grid">
            <Report title="Where they were before" rows={came} range={range} bar={(f) => f.visits} rowKey={(f) => f.label} columns={flowColumns} />
            <Report title="Where they went next" rows={went} range={range} bar={(f) => f.visits} rowKey={(f) => f.label} columns={flowColumns} />
          </div>
        </section>
      )}

      <div className="analytics-section">
        <Report
          title="Common routes through the website"
          note="The first four pages of each visit, in order."
          rows={journeys}
          range={range}
          csv="journeys"
          bar={(j) => j.visits}
          rowKey={(j) => j.journey}
          wide
          columns={[
            { head: "Route", cell: (j) => j.journey },
            { head: "Visits", cell: (j) => nf.format(j.visits) },
            { head: "Visitors", cell: (j) => nf.format(j.visitors) },
          ]}
        />
      </div>

      <section id="visits" className="admin-panel analytics-section">
        <div className="analytics-table-head">
          <h2>Individual visits</h2>
          {visits.length > 0 && <a className="analytics-csv" href={csvHref("visits", range)} download>CSV</a>}
        </div>
        <p className="admin-muted analytics-note">Newest first. Visitors aren’t identified: each visit is just a list of pages.</p>
        {visits.length === 0 ? (
          <p className="admin-muted">{offset ? "No older visits in this period." : "Nothing yet."}</p>
        ) : (
          <ol className="analytics-visits">
            {visits.map((v, i) => (
              <li key={v.started + i}>
                <div className="analytics-visit-meta">
                  <strong>{ukDateTime(v.started)}</strong>
                  <span>{[v.device && capital(v.device), v.browser, v.place].filter(Boolean).join(" · ")}</span>
                  <span>{v.source ? `from ${v.source}` : "direct or unknown"}</span>
                  {v.seconds !== null && <span>{duration(v.seconds)}</span>}
                  {v.returning && <span className="admin-badge">Returning</span>}
                </div>
                <p className="analytics-visit-pages">
                  {v.pages.map((p, j) => (
                    <span key={j}>{p}</span>
                  ))}
                </p>
              </li>
            ))}
          </ol>
        )}
        <div className="analytics-pager">
          {offset > 0 && <Link href={analyticsHref("pages", range, offset > 30 ? { older: String(offset - 30) } : {}) + "#visits"}>← Newer</Link>}
          {visits.length === 30 && <Link href={analyticsHref("pages", range, { older: String(offset + 30) }) + "#visits"}>Older visits →</Link>}
        </div>
      </section>
    </>
  );
}

// ---------- Clicks & downloads ----------

const KIND_LABELS: Record<string, string> = {
  download: "Downloads",
  outbound: "Links to other websites",
  phone: "Phone numbers",
  email: "Email addresses",
  internal: "Links within the website",
  button: "Buttons",
};

function fileName(url: string | null): string {
  if (!url) return "";
  try {
    return decodeURIComponent(new URL(url, "https://x").pathname.split("/").pop() ?? url);
  } catch {
    return url;
  }
}

function host(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function clickColumns(describe: (c: ClickRow) => string, head = "Clicked"): Column<ClickRow>[] {
  return [
    {
      head,
      cell: (c) => (
        <>
          {c.label || describe(c)}
          {c.label && describe(c) && <span className="analytics-sub">{describe(c)}</span>}
        </>
      ),
    },
    { head: "Clicks", cell: (c) => nf.format(c.clicks) },
    { head: "Visitors", cell: (c) => nf.format(c.visitors) },
  ];
}

export function ClicksView({ range, kinds, downloads, outbound, contact, internal, buttons }: {
  range: RangeKey; kinds: { kind: string; clicks: number; visitors: number }[];
  downloads: ClickRow[]; outbound: ClickRow[]; contact: ClickRow[]; internal: ClickRow[]; buttons: ClickRow[];
}) {
  const count = (k: string) => kinds.find((x) => x.kind === k)?.clicks ?? 0;
  return (
    <>
      <div className="analytics-stats">
        {["download", "outbound", "phone", "email", "internal", "button"].map((k) => (
          <Stat key={k} label={KIND_LABELS[k]} value={nf.format(count(k))} />
        ))}
      </div>
      <div className="analytics-grid analytics-section">
        <Report title="Downloads" note="Bulletins, newsletters and sermon audio." rows={downloads} range={range} csv="clicks-download" bar={(c) => c.clicks} rowKey={(c, i) => (c.target ?? "") + i} columns={clickColumns((c) => fileName(c.target), "File")} />
        <Report title="Links to other websites" rows={outbound} range={range} csv="clicks-outbound" bar={(c) => c.clicks} rowKey={(c, i) => (c.target ?? "") + i} columns={clickColumns((c) => host(c.target), "Link")} />
        <Report title="Phone and email" rows={contact} range={range} csv="clicks-contact" bar={(c) => c.clicks} rowKey={(c, i) => (c.target ?? "") + i} columns={clickColumns((c) => (c.target ?? "").replace(/^(tel|mailto):/, ""), "Contact")} />
        <Report title="Buttons" note="Menu, play and other buttons that don’t go to another page." rows={buttons} range={range} csv="clicks-button" bar={(c) => c.clicks} rowKey={(c, i) => (c.label ?? "") + i} columns={clickColumns(() => "", "Button")} />
      </div>
      <div className="analytics-section">
        <Report title="Links within the website" rows={internal} range={range} csv="clicks-internal" bar={(c) => c.clicks} rowKey={(c, i) => (c.target ?? "") + i} wide columns={clickColumns((c) => c.target ?? "", "Link")} />
      </div>
    </>
  );
}

// ---------- Sermons ----------

export function SermonsView({ range, totals, rows }: { range: RangeKey; totals: SermonPlays; rows: SermonRow[] }) {
  return (
    <>
      <div className="analytics-stats">
        <Stat label="Plays" value={nf.format(totals.plays)} />
        <Stat label="Audio" value={nf.format(totals.audio)} />
        <Stat label="Video" value={nf.format(totals.video)} />
        <Stat label="Listeners" value={nf.format(totals.listeners)} />
        <Stat label="Average progress" value={totals.avg_progress === null ? "–" : `${Math.round(totals.avg_progress)}%`} />
        <Stat label="Finished" value={percent(totals.finished, totals.plays)} note={`${nf.format(totals.finished)} plays`} />
      </div>
      <p className="analytics-compare">
        A play is someone pressing play on a sermon’s audio or video during a visit. Progress is the furthest point they
        reached: a quarter, half, three quarters or the end.
      </p>
      <Report
        title="Sermons played"
        rows={rows}
        range={range}
        csv="sermons"
        bar={(s) => s.plays}
        rowKey={(s) => s.path}
        wide
        empty="No sermons played yet."
        columns={[
          { head: "Sermon", cell: (s) => <>{s.title ?? s.path}<span className="analytics-sub">{s.path}</span></> },
          { head: "Plays", cell: (s) => nf.format(s.plays) },
          { head: "Audio", cell: (s) => nf.format(s.audio) },
          { head: "Video", cell: (s) => nf.format(s.video) },
          { head: "Listeners", cell: (s) => nf.format(s.listeners) },
          { head: "Avg progress", cell: (s) => (s.avg_progress === null ? "–" : `${Math.round(s.avg_progress)}%`) },
          { head: "Finished", cell: (s) => percent(s.finished, s.plays) },
        ]}
      />
    </>
  );
}

// ---------- Searches ----------

const FILTER_LABELS: Record<string, string> = { preacher: "Preacher", book: "Book", year: "Year", service: "Service" };
const filterValue = (filter: string, value: string) =>
  filter === "service" ? ({ am: "Morning", pm: "Evening" } as Record<string, string>)[value] ?? value : value;

export function SearchesView({ range, terms, filters }: { range: RangeKey; terms: SearchRow[]; filters: { filter: string; value: string; uses: number }[] }) {
  const total = terms.reduce((n, t) => n + t.searches, 0);
  const none = terms.filter((t) => t.no_results > 0);
  const termColumns: Column<SearchRow>[] = [
    { head: "Searched for", cell: (t) => `“${t.term}”` },
    { head: "Searches", cell: (t) => nf.format(t.searches) },
    { head: "Visitors", cell: (t) => nf.format(t.visitors) },
    { head: "Sermons found", cell: (t) => (t.avg_results === null ? "–" : nf.format(Math.round(t.avg_results))) },
  ];
  return (
    <>
      <div className="analytics-stats">
        <Stat label="Searches" value={nf.format(total)} />
        <Stat label="Different searches" value={nf.format(terms.length)} />
        <Stat label="Found nothing" value={nf.format(none.reduce((n, t) => n + t.no_results, 0))} />
        <Stat label="Filters used" value={nf.format(filters.reduce((n, f) => n + f.uses, 0))} />
      </div>
      <p className="analytics-compare">From the search box and filters in the sermon archive. A search is counted once someone stops typing.</p>
      <Report title="Top searches" rows={terms.slice(0, 50)} range={range} csv="searches" bar={(t) => t.searches} rowKey={(t) => t.term} columns={termColumns} empty="No searches yet." />
      <div className="analytics-grid">
        <Report
          title="Searches that found nothing"
          note="Worth checking: a sermon may be missing its details, or spelt differently."
          rows={none.sort((a, b) => b.no_results - a.no_results).slice(0, 50)}
          range={range}
          bar={(t) => t.no_results}
          rowKey={(t) => t.term}
          empty="None: every search found something."
          columns={[{ head: "Searched for", cell: (t) => `“${t.term}”` }, { head: "Times", cell: (t) => nf.format(t.no_results) }]}
        />
        <Report
          title="Filters chosen"
          rows={filters}
          range={range}
          csv="filters"
          bar={(f) => f.uses}
          rowKey={(f) => f.filter + f.value}
          empty="No filters used yet."
          columns={[
            { head: "Filter", cell: (f) => <>{filterValue(f.filter, f.value)}<span className="analytics-sub">{FILTER_LABELS[f.filter] ?? f.filter}</span></> },
            { head: "Times", cell: (f) => nf.format(f.uses) },
          ]}
        />
      </div>
    </>
  );
}

// ---------- Missing pages ----------

export function MissingView({ range, rows }: { range: RangeKey; rows: MissingRow[] }) {
  return (
    <>
      <p className="analytics-compare analytics-lead">
        Addresses people tried to visit that don’t exist, so they saw the “page not found” page. These are often old links
        (from the old website, Google or Facebook) or mistyped addresses. If one comes up often, it could be redirected to
        the right page.
      </p>
      <Report
        title="Missing pages"
        rows={rows}
        range={range}
        csv="missing"
        bar={(r) => r.views}
        rowKey={(r) => r.path}
        wide
        empty="No one has hit a missing page in this period."
        columns={[
          { head: "Address", cell: (r) => r.path },
          { head: "Times", cell: (r) => nf.format(r.views) },
          { head: "Visitors", cell: (r) => nf.format(r.visitors) },
          { head: "Usually came from", cell: (r) => r.came_from ?? "Typed or unknown", text: true },
          { head: "Last", cell: (r) => ukDateTime(r.last_seen), text: true },
        ]}
      />
    </>
  );
}
