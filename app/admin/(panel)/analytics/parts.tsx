import Link from "next/link";
import type { ReactNode } from "react";
import type { RangeKey } from "./ranges";

// Shared pieces for the Admin → Analytics pages.

export const VIEWS = [
  { key: "overview", label: "Overview" },
  { key: "pages", label: "Pages & journeys" },
  { key: "heatmaps", label: "Heatmaps" },
  { key: "goals", label: "Goals & funnels" },
  { key: "clicks", label: "Clicks & downloads" },
  { key: "sermons", label: "Sermons" },
  { key: "documents", label: "Bulletins & newsletters" },
  { key: "searches", label: "Searches" },
  { key: "missing", label: "Missing pages" },
] as const;
export type ViewKey = (typeof VIEWS)[number]["key"];

export const nf = new Intl.NumberFormat("en-GB");

export function analyticsHref(view: ViewKey, range: RangeKey, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ ...(view === "overview" ? {} : { view }), ...(range === "30d" ? {} : { range }), ...extra });
  const query = params.toString();
  return `/admin/analytics/${query ? `?${query}` : ""}`;
}

export function csvHref(report: string, range: RangeKey): string {
  return `/admin/analytics/export/?${new URLSearchParams({ report, range })}`;
}

export function duration(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return "–";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;
}

export const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");

export function ukDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function Stat({ label, value, delta, note }: { label: string; value: string; delta?: ReactNode; note?: string }) {
  return (
    <div className="analytics-stat">
      <span className="analytics-stat-label">{label}</span>
      <strong>{value}</strong>
      {delta}
      {note && <span className="analytics-stat-note">{note}</span>}
    </div>
  );
}

export function CsvLink({ report, range }: { report: string; range: RangeKey }) {
  return (
    <a className="analytics-csv" href={csvHref(report, range)} download>
      CSV
    </a>
  );
}

export type Column<T> = { head: string; cell: (row: T) => ReactNode; text?: boolean };

// A report table: the first column has a shaded bar showing each row's share.
export function Report<T>({
  title,
  rows,
  columns,
  bar,
  csv,
  range,
  empty = "Nothing yet.",
  note,
  wide = false,
  rowKey,
}: {
  title: string;
  rows: T[];
  columns: Column<T>[];
  bar: (row: T) => number;
  csv?: string;
  range: RangeKey;
  empty?: string;
  note?: ReactNode;
  wide?: boolean;
  rowKey: (row: T, index: number) => string;
}) {
  const max = Math.max(1, ...rows.map(bar));
  const [first, ...rest] = columns;
  return (
    <section className={`admin-panel analytics-table${wide ? " analytics-wide" : ""}`}>
      <div className="analytics-table-head">
        <h2>{title}</h2>
        {csv && rows.length > 0 && <CsvLink report={csv} range={range} />}
      </div>
      {note && <p className="admin-muted analytics-note">{note}</p>}
      {rows.length === 0 ? (
        <p className="admin-muted">{empty}</p>
      ) : (
        <div className="analytics-scroll">
          <table>
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th key={c.head} scope="col" className={i > 0 && c.text ? "is-text" : undefined}>
                    {c.head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={rowKey(row, i)}>
                  <td>
                    <span className="analytics-bar" style={{ width: `${(bar(row) / max) * 100}%` }} />
                    <span className="analytics-label">{first.cell(row)}</span>
                  </td>
                  {rest.map((c) => (
                    <td key={c.head} className={c.text ? "is-text" : undefined}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <p className="analytics-more">
      <Link href={href}>{children}</Link>
    </p>
  );
}
