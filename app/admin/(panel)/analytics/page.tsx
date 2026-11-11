import type { Metadata } from "next";
import Link from "next/link";
import { requireTool } from "@/lib/admin-auth";
import {
  analyticsSettings,
  breakdown,
  clickKinds,
  clicks,
  flow,
  funnel,
  goalSources,
  heatmapClicks,
  loadGoals,
  SCREEN_SIZES,
  scrollReach,
  isMissingSetup,
  lastRecorded,
  recordingProblem,
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
import { headers } from "next/headers";
import { ADMIN_HOST, SITE_HOST } from "@/lib/domains";
import { describeStorageError, supabaseIsConfigured } from "@/lib/supabase";
import DatabaseSetup from "../_setup/DatabaseSetup";
import { analyticsHref, VIEWS, type ViewKey } from "./parts";
import { RANGES, rangeFor, type RangeKey } from "./ranges";
import { ClicksView, GoalsView, HeatmapsView, MissingView, OverviewView, PagesView, SearchesView, SermonsView } from "./views";

export const metadata: Metadata = { title: "Analytics" };

function Setup({ error }: { error?: unknown }) {
  return (
    <DatabaseSetup title="Set up (or update) the database" details={error ? describeStorageError(error) : undefined}>
      <p>The analytics are kept in your Supabase database, which needs setting up once, and again when new reports are added.</p>
    </DatabaseSetup>
  );
}

type Params = { range?: string; view?: string; page?: string; older?: string; size?: string; goal?: string };

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
      const [lastAt, problem] = await Promise.all([lastRecorded().catch(() => null), recordingProblem()]);
      body = (
        <OverviewView
          range={key}
          current={current}
          data={{ now, before, chart, top, sources, campaigns, countries, cities, devices, browsers, systems, screens, storage }}
          enabled={settings.enabled}
          lastAt={lastAt}
          problem={problem && (!lastAt || problem.at > lastAt) ? problem : undefined}
          isOwner={me.role === "owner"}
        />
      );
    } else if (view === "pages") {
      const offset = Math.max(0, Math.min(10_000, Number(params.older) || 0));
      const [all, routes, recent, links] = await Promise.all([pages(current, 100), journeys(current, 4, 20), visits(current, 30, offset), flow(current, 4, 6)]);
      const chosen = params.page && params.page.startsWith("/") ? params.page : all[0]?.path;
      const before = chosen ? await pageFlow(current, chosen, 10) : [];
      body = <PagesView range={key} pages={all} chosen={chosen} flow={before} flowLinks={links} journeys={routes} visits={recent} offset={offset} />;
    } else if (view === "heatmaps") {
      const size = SCREEN_SIZES.find((s) => s.key === params.size) ?? SCREEN_SIZES[0];
      const top = (await pages(current, 100)).map((p) => p.path);
      // A page on this website only ("//..." would be another website).
      const path = params.page && /^\/(?!\/)/.test(params.page) ? params.page.slice(0, 300) : top[0];
      const [spots, reach] = path ? await Promise.all([heatmapClicks(current, path, size), scrollReach(current, path, size)]) : [[], []];
      // The admin panel is on its own address, so the page comes from the website's address.
      const host = ((await headers()).get("host") ?? "").split(":")[0].toLowerCase();
      const siteOrigin = host === ADMIN_HOST ? `https://${SITE_HOST}` : "";
      body = (
        <HeatmapsView range={key} pages={top} path={path} sizeKey={size.key} siteOrigin={siteOrigin}
          clicks={spots.map(({ sel, fx, fy }) => ({ sel, fx, fy }))} reach={reach} />
      );
    } else if (view === "goals") {
      const config = await loadGoals();
      const [goals, funnels, totals] = await Promise.all([
        Promise.all(config.goals.map(async (goal) => ({ goal, now: await funnel(current, [goal.condition]), before: await funnel(previous, [goal.condition]) }))),
        Promise.all(config.funnels.map(async (f) => ({ funnel: f, result: await funnel(current, f.steps.map((s) => s.condition)) }))),
        overview(current),
      ]);
      const chosen = config.goals.find((g) => g.id === params.goal);
      const sources = chosen ? await goalSources(current, chosen.condition, 10) : [];
      body = <GoalsView range={key} config={config} goals={goals} funnels={funnels} sessions={totals.sessions} chosen={chosen} sources={sources} />;
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
