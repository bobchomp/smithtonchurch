import type { Metadata } from "next";
import Link from "next/link";
import { activityActors, readActivity, type ActivityFilter, type ActivityRow } from "@/lib/activity";
import { requireTool } from "@/lib/admin-auth";
import { tableReady } from "@/lib/db";
import { ukTimeToIso } from "@/lib/live-notice-types";
import { describeStorageError } from "@/lib/supabase";
import DatabaseSetup from "../_setup/DatabaseSetup";

export const metadata: Metadata = { title: "Activity Log" };

const AREAS = ["Sign-in", "Account", "Users", "Sermons", "Livestreams", "Bulletins", "Newsletters", "Live notices", "Messages", "Analytics", "Backup", "Database"];
const PERIODS = [
  { key: "", label: "All time", days: 0 },
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
];

type Params = { area?: string; who?: string; period?: string; page?: string };

function ukDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function ukTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
}

// The start of "today" (UK time) a number of days back, as an exact time.
function since(days: number): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return ukTimeToIso(`${d.toISOString().slice(0, 10)}T00:00`)!;
}

function Details({ details }: { details: Record<string, unknown> }) {
  const text = (v: unknown): string =>
    v === null || v === undefined ? "–" : Array.isArray(v) ? v.map(text).join(", ") || "none" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return (
    <dl className="activity-details">
      {Object.entries(details).map(([k, v]) => {
        const change = v && typeof v === "object" && "from" in (v as object) && "to" in (v as object) ? (v as { from: unknown; to: unknown }) : undefined;
        return (
          <div key={k}>
            <dt>{k.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()}</dt>
            <dd>{change ? <>{text(change.from)} <span aria-hidden="true">→</span><span className="visually-hidden"> changed to </span> {text(change.to)}</> : text(v)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function href(params: Params, change: Partial<Params>): string {
  const merged = { ...params, ...change };
  const q = new URLSearchParams(Object.entries(merged).filter(([, v]) => v) as [string, string][]);
  return `/admin/activity/${q.size ? `?${q}` : ""}`;
}

export default async function ActivityLog({ searchParams }: { searchParams: Promise<Params> }) {
  await requireTool("activity-log");
  const params = await searchParams;
  const page = Math.max(0, Math.min(10_000, Number(params.page) || 0));
  const period = PERIODS.find((p) => p.key === params.period) ?? PERIODS[0];
  const filter: ActivityFilter = {
    area: AREAS.includes(params.area ?? "") ? params.area : undefined,
    actor: params.who?.slice(0, 120) || undefined,
    from: period.days ? since(period.days) : undefined,
  };

  const heading = (
    <>
      <h1>Activity Log</h1>
      <p className="admin-intro">
        Everything done in the admin panel, newest first, and who did it. Things the website does by itself (such as
        checking YouTube or receiving a message) are shown as “System”.
      </p>
    </>
  );

  if (!(await tableReady("activity_log").catch(() => false))) {
    return (
      <>
        {heading}
        <DatabaseSetup title="Finish setting up the database">
          <p>The activity log is kept in the database. Run the setup script to start recording.</p>
        </DatabaseSetup>
      </>
    );
  }

  let data: { rows: ActivityRow[]; more: boolean; actors: string[] };
  try {
    const [{ rows, more }, actors] = await Promise.all([readActivity(filter, page), activityActors()]);
    data = { rows, more, actors };
  } catch (error) {
    return (
      <>
        {heading}
        <p className="admin-error">Couldn’t load the activity log. {describeStorageError(error)}</p>
      </>
    );
  }

  // Grouped by day.
  const days: { day: string; rows: ActivityRow[] }[] = [];
  for (const row of data.rows) {
    const day = ukDay(row.at);
    if (days[days.length - 1]?.day !== day) days.push({ day, rows: [] });
    days[days.length - 1].rows.push(row);
  }
  const csv = `/admin/activity/export/?${new URLSearchParams(Object.entries({ area: filter.area, who: filter.actor, period: period.key }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <>
      {heading}
      <form className="activity-filters" method="get" action="/admin/activity/">
        <label>
          Area
          <select name="area" defaultValue={filter.area ?? ""}>
            <option value="">Everything</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          Who
          <select name="who" defaultValue={filter.actor ?? ""}>
            <option value="">Everyone</option>
            {data.actors.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          When
          <select name="period" defaultValue={period.key}>
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </label>
        <button className="button" type="submit">Show</button>
        <a className="analytics-csv activity-csv" href={csv} download>CSV</a>
      </form>

      {data.rows.length === 0 ? (
        <section className="admin-panel">
          <p className="admin-muted">{page ? "No older activity." : "Nothing recorded yet for this choice."}</p>
        </section>
      ) : (
        days.map(({ day, rows }) => (
          <section key={day} className="admin-panel activity-day">
            <h2>{day}</h2>
            <ol className="activity-list">
              {rows.map((r) => (
                <li key={r.id}>
                  <time dateTime={r.at}>{ukTime(r.at)}</time>
                  <div className="activity-what">
                    <p>
                      <strong className={r.actor_id ? "activity-who" : "activity-who activity-system"}>{r.actor}</strong>{" "}
                      {r.action}
                      {r.target && <span className="activity-target">: {r.target}</span>}
                    </p>
                    {r.details && Object.keys(r.details).length > 0 && <Details details={r.details} />}
                  </div>
                  <span className="admin-badge activity-area">{r.area}</span>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}

      <div className="analytics-pager">
        {page > 0 && <Link href={href(params, { page: page > 1 ? String(page - 1) : undefined })}>← Newer</Link>}
        {data.more && <Link className="activity-older" href={href(params, { page: String(page + 1) })}>Older →</Link>}
      </div>
    </>
  );
}
