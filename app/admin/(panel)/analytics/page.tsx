import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { requireTool } from "@/lib/admin-auth";
import {
  analyticsSettings,
  breakdown,
  clickKinds,
  clicks,
  isMissingSetup,
  journeys,
  live,
  notFound,
  overview,
  pageFlow,
  pages,
  searches,
  searchFilters,
  sermonPlays,
  sermonTotals,
  series,
  storageUsed,
  visits,
} from "@/lib/analytics";
import { describeStorageError, supabaseIsConfigured } from "@/lib/supabase";
import CopySql from "./CopySql";
import { analyticsHref, VIEWS, type ViewKey } from "./parts";
import { RANGES, rangeFor, type RangeKey } from "./ranges";
import { ClicksView, MissingView, OverviewView, PagesView, SearchesView, SermonsView } from "./views";

export const metadata: Metadata = { title: "Analytics" };

function Setup({ error }: { error?: unknown }) {
  let sql = "";
  try {
    sql = readFileSync(join(process.cwd(), "supabase/analytics.sql"), "utf8");
  } catch {
    sql = "-- The setup script (supabase/analytics.sql) couldn’t be read.";
  }
  return (
    <section className="admin-panel admin-panel-narrow analytics-setup">
      <h2>Set up (or update) the analytics database</h2>
      <p>
        The analytics are kept in your Supabase database. It needs setting up once, and again when new reports are
        added (running it again keeps everything already recorded):
      </p>
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

type Params = { range?: string; view?: string; page?: string; older?: string };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const me = await requireTool("analytics");
  const params = await searchParams;
  const key = (RANGES.find((r) => r.key === params.range)?.key ?? "30d") as RangeKey;
  const view = (VIEWS.find((v) => v.key === params.view)?.key ?? "overview") as ViewKey;
  const { current, previous } = rangeFor(key);

  const heading = (
    <>
      <h1>Analytics</h1>
      <p className="admin-intro">
        How people find and use the website. Visits from signed-in admins aren’t counted, and nor are people who chose
        “Don’t count me”.
      </p>
    </>
  );

  if (!supabaseIsConfigured()) {
    return (
      <>
        {heading}
        <p className="admin-error">Supabase isn’t set up yet.</p>
      </>
    );
  }

  let body: React.ReactNode;
  let onNow: { path: string; visitors: number }[] = [];
  try {
    onNow = await live();
    if (view === "overview") {
      const [now, before, chart, top, sources, campaigns, countries, cities, devices, browsers, systems, screens, storage, settings] =
        await Promise.all([
          overview(current),
          overview(previous),
          series(current),
          pages(current, 10),
          breakdown(current, "source"),
          breakdown(current, "campaign"),
          breakdown(current, "country"),
          breakdown(current, "city"),
          breakdown(current, "device"),
          breakdown(current, "browser"),
          breakdown(current, "os"),
          breakdown(current, "screen"),
          storageUsed(),
          analyticsSettings(true),
        ]);
      body = (
        <OverviewView
          range={key}
          current={current}
          data={{ now, before, chart, top, sources, campaigns, countries, cities, devices, browsers, systems, screens, storage }}
          enabled={settings.enabled}
          isOwner={me.role === "owner"}
        />
      );
    } else if (view === "pages") {
      const offset = Math.max(0, Math.min(10_000, Number(params.older) || 0));
      const [all, routes, recent] = await Promise.all([pages(current, 100), journeys(current, 4, 20), visits(current, 30, offset)]);
      const chosen = params.page && params.page.startsWith("/") ? params.page : all[0]?.path;
      const flow = chosen ? await pageFlow(current, chosen, 10) : [];
      body = <PagesView range={key} pages={all} chosen={chosen} flow={flow} journeys={routes} visits={recent} offset={offset} />;
    } else if (view === "clicks") {
      const [kinds, downloads, outbound, contact, internal, buttons] = await Promise.all([
        clickKinds(current),
        clicks(current, "download", 30),
        clicks(current, "outbound", 30),
        Promise.all([clicks(current, "phone", 15), clicks(current, "email", 15)]).then(([a, b]) => [...a, ...b].sort((x, y) => y.clicks - x.clicks)),
        clicks(current, "internal", 30),
        clicks(current, "button", 30),
      ]);
      body = <ClicksView range={key} kinds={kinds} downloads={downloads} outbound={outbound} contact={contact} internal={internal} buttons={buttons} />;
    } else if (view === "sermons") {
      const [totals, rows] = await Promise.all([sermonTotals(current), sermonPlays(current, 100)]);
      body = <SermonsView range={key} totals={totals} rows={rows} />;
    } else if (view === "searches") {
      const [terms, filters] = await Promise.all([searches(current, 1000), searchFilters(current, 50)]);
      body = <SearchesView range={key} terms={terms} filters={filters} />;
    } else {
      body = <MissingView range={key} rows={await notFound(current, 100)} />;
    }
  } catch (error) {
    if (isMissingSetup(error)) {
      return (
        <>
          {heading}
          <Setup error={error} />
        </>
      );
    }
    return (
      <>
        {heading}
        <p className="admin-error">Couldn’t load the analytics. {describeStorageError(error)}</p>
      </>
    );
  }

  const liveTotal = onNow.reduce((n, r) => n + r.visitors, 0);
  return (
    <>
      {heading}
      <nav className="analytics-views" aria-label="Reports">
        {VIEWS.map((v) => (
          <Link key={v.key} href={analyticsHref(v.key, key)} aria-current={v.key === view ? "page" : undefined}>
            {v.label}
          </Link>
        ))}
      </nav>
      <div className="analytics-bar-top">
        <nav className="analytics-ranges" aria-label="Date range">
          {RANGES.map((r) => (
            <Link key={r.key} href={analyticsHref(view, r.key)} aria-current={r.key === key ? "page" : undefined}>
              {r.label}
            </Link>
          ))}
        </nav>
        <div className={`analytics-live${liveTotal ? " is-live" : ""}`} title={onNow.map((r) => `${r.path}: ${r.visitors}`).join("\n")}>
          <span className="analytics-live-dot" aria-hidden="true" /> {liveTotal} on the site now
        </div>
      </div>
      {body}
    </>
  );
}
