import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { requireTool } from "@/lib/admin-auth";
import {
  analyticsSettings,
  breakdown,
  isMissingSetup,
  live,
  overview,
  pages,
  series,
  storageUsed,
  type BreakdownRow,
} from "@/lib/analytics";
import { describeStorageError, supabaseIsConfigured } from "@/lib/supabase";
import { setTracking } from "./actions";
import Chart from "./Chart";
import CopySql from "./CopySql";
import { bucketKey, buckets, RANGES, rangeFor, type RangeKey } from "./ranges";

export const metadata: Metadata = { title: "Analytics" };

const nf = new Intl.NumberFormat("en-GB");

function duration(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return "–";
  const s = Math.round(seconds);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${pad(s % 60)}s`;
}
const pad = (n: number) => String(n).padStart(2, "0");

function change(now: number | null, before: number | null, lowerIsBetter = false) {
  if (now === null || before === null || before === 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="analytics-change">no change</span>;
  const good = lowerIsBetter ? pct < 0 : pct > 0;
  return <span className={`analytics-change ${good ? "is-up" : "is-down"}`}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%</span>;
}

function Stat({ label, value, delta }: { label: string; value: string; delta: React.ReactNode }) {
  return (
    <div className="analytics-stat">
      <span className="analytics-stat-label">{label}</span>
      <strong>{value}</strong>
      {delta}
    </div>
  );
}

function Table({ title, rows, col = "Visitors", unit = "visitors", empty = "Nothing yet." }: { title: string; rows: BreakdownRow[]; col?: string; unit?: "visitors" | "pageviews"; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r[unit]));
  return (
    <section className="admin-panel analytics-table">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="admin-muted">{empty}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col" className="visually-hidden">Name</th>
              <th scope="col">{col}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>
                  <span className="analytics-bar" style={{ width: `${(r[unit] / max) * 100}%` }} />
                  <span className="analytics-label">{r.label}</span>
                </td>
                <td>{nf.format(r[unit])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Setup({ error }: { error?: unknown }) {
  let sql = "";
  try {
    sql = readFileSync(join(process.cwd(), "supabase/analytics.sql"), "utf8");
  } catch {
    sql = "-- The setup script (supabase/analytics.sql) couldn’t be read.";
  }
  return (
    <section className="admin-panel admin-panel-narrow analytics-setup">
      <h2>Set up the analytics database</h2>
      <p>The analytics are kept in your Supabase database. It needs setting up once:</p>
      <ol>
        <li>Press <strong>Copy the setup script</strong> below.</li>
        <li>In the Supabase dashboard, open your project, then <strong>SQL Editor</strong> → <strong>New query</strong>.</li>
        <li>Paste the script and press <strong>Run</strong>. It should say “Success. No rows returned”.</li>
        <li>Come back here and reload this page.</li>
      </ol>
      <CopySql sql={sql} />
      {error ? <p className="admin-muted analytics-setup-error">Details: {describeStorageError(error)}</p> : null}
    </section>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const me = await requireTool("analytics");
  const wanted = (await searchParams).range;
  const key = (RANGES.find((r) => r.key === wanted)?.key ?? "30d") as RangeKey;
  const { current, previous } = rangeFor(key);

  if (!supabaseIsConfigured()) {
    return (
      <>
        <h1>Analytics</h1>
        <p className="admin-error">Supabase isn’t set up yet.</p>
      </>
    );
  }

  let data;
  try {
    const [now, before, chart, top, sources, campaigns, countries, cities, devices, browsers, systems, screens, onNow, storage] =
      await Promise.all([
        overview(current),
        overview(previous),
        series(current),
        pages(current, 50),
        breakdown(current, "source"),
        breakdown(current, "campaign"),
        breakdown(current, "country"),
        breakdown(current, "city"),
        breakdown(current, "device"),
        breakdown(current, "browser"),
        breakdown(current, "os"),
        breakdown(current, "screen"),
        live(),
        storageUsed(),
      ]);
    data = { now, before, chart, top, sources, campaigns, countries, cities, devices, browsers, systems, screens, onNow, storage };
  } catch (error) {
    if (isMissingSetup(error)) {
      return (
        <>
          <h1>Analytics</h1>
          <p className="admin-intro">See how people find and use the website.</p>
          <Setup error={error} />
        </>
      );
    }
    return (
      <>
        <h1>Analytics</h1>
        <p className="admin-error">Couldn’t load the analytics. {describeStorageError(error)}</p>
      </>
    );
  }

  const { enabled } = await analyticsSettings(true);
  const { now, before, chart, top, onNow, storage } = data;
  const byBucket = new Map(chart.map((p) => [bucketKey(p.bucket, current.unit), p]));
  const points = buckets(current).map((b) => ({ label: b.label, pageviews: byBucket.get(b.key)?.pageviews ?? 0, visitors: byBucket.get(b.key)?.visitors ?? 0 }));
  const liveTotal = onNow.reduce((n, r) => n + r.visitors, 0);
  const comparedWith = key === "today" ? "yesterday" : "the previous " + RANGES.find((r) => r.key === key)!.label.toLowerCase();

  return (
    <>
      <h1>Analytics</h1>
      <p className="admin-intro">
        How people find and use the website. Visits from signed-in admins aren’t counted, and nor are people who chose
        “Don’t count me”.
      </p>

      <div className="analytics-bar-top">
        <nav className="analytics-ranges" aria-label="Date range">
          {RANGES.map((r) => (
            <Link key={r.key} href={`/admin/analytics/?range=${r.key}`} aria-current={r.key === key ? "page" : undefined}>
              {r.label}
            </Link>
          ))}
        </nav>
        <div className={`analytics-live${liveTotal ? " is-live" : ""}`} title={onNow.map((r) => `${r.path}: ${r.visitors}`).join("\n")}>
          <span className="analytics-live-dot" aria-hidden="true" /> {liveTotal} on the site now
        </div>
      </div>

      {!enabled && (
        <div className="admin-notice admin-notice-spaced">
          <p>
            <strong>Tracking is switched off</strong>, so nothing new is being recorded
            {me.role === "owner" ? ". Switch it on below once the privacy notice is published." : ". An owner can switch it on."}
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

      <section className="admin-panel analytics-table analytics-pages">
        <h2>Pages</h2>
        {top.length === 0 ? (
          <p className="admin-muted">Nothing yet.</p>
        ) : (
          <div className="analytics-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Page</th>
                  <th scope="col">Views</th>
                  <th scope="col">Visitors</th>
                  <th scope="col">Time on page</th>
                  <th scope="col">Scrolled</th>
                  <th scope="col">Entries</th>
                  <th scope="col">Exits</th>
                </tr>
              </thead>
              <tbody>
                {top.map((p) => (
                  <tr key={p.path}>
                    <td>
                      <span className="analytics-bar" style={{ width: `${(p.pageviews / top[0].pageviews) * 100}%` }} />
                      <span className="analytics-label">{p.path}</span>
                    </td>
                    <td>{nf.format(p.pageviews)}</td>
                    <td>{nf.format(p.visitors)}</td>
                    <td>{duration(p.avg_seconds)}</td>
                    <td>{p.avg_scroll === null ? "–" : `${Math.round(p.avg_scroll)}%`}</td>
                    <td>{nf.format(p.entries)}</td>
                    <td>{nf.format(p.exits)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="analytics-grid">
        <Table title="Where visitors came from" rows={data.sources} col="Visits" unit="pageviews" />
        <Table title="Campaigns" rows={data.campaigns} col="Visits" unit="pageviews" empty="No campaign links used yet (links with ?utm_campaign=…)." />
        <Table title="Countries" rows={data.countries} />
        <Table title="Towns and cities" rows={data.cities} />
        <Table title="Devices" rows={data.devices.map((r) => ({ ...r, label: r.label[0].toUpperCase() + r.label.slice(1) }))} />
        <Table title="Screen sizes" rows={data.screens} />
        <Table title="Browsers" rows={data.browsers} />
        <Table title="Operating systems" rows={data.systems} />
      </div>

      <div className="admin-columns">
        <section className="admin-panel">
          <h2>Tracking</h2>
          {me.role === "owner" ? (
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
          <h2>Storage</h2>
          <p className="admin-muted">
            {nf.format(storage.events)} events recorded
            {storage.since ? ` since ${new Date(storage.since).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""},
            using {(storage.bytes / 1024 / 1024).toFixed(1)} MB of the database (the free Supabase plan includes 500 MB).
          </p>
        </section>
      </div>
    </>
  );
}
