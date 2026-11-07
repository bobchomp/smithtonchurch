import { requireTool } from "@/lib/admin-auth";
import {
  allEvents,
  breakdown,
  clicks,
  journeys,
  notFound,
  pages,
  searches,
  searchFilters,
  sermonPlays,
  visits,
  type Dimension,
  type Range,
} from "@/lib/analytics";
import { RANGES, rangeFor, type RangeKey } from "../ranges";

// CSV downloads for Admin → Analytics: each report, or every event in the period.

export const dynamic = "force-dynamic";

type Rows = Record<string, unknown>[];

// A cell for a spreadsheet. Text from visitors that starts like a formula is prefixed so
// spreadsheet programs don't run it.
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = Array.isArray(value) ? value.join(" → ") : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Rows, columns?: string[]): string {
  const keys = columns ?? [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return [keys.join(","), ...rows.map((r) => keys.map((k) => cell(r[k])).join(","))].join("\r\n") + "\r\n";
}

const BIG = 10_000;
const DIMENSIONS: Record<string, Dimension> = {
  sources: "source", campaigns: "campaign", countries: "country", cities: "city", devices: "device", browsers: "browser", os: "os", screens: "screen",
};

async function report(name: string, r: Range): Promise<Rows | undefined> {
  if (name in DIMENSIONS) return breakdown(r, DIMENSIONS[name], BIG);
  switch (name) {
    case "pages": return pages(r, BIG);
    case "journeys": return journeys(r, 4, BIG);
    case "visits": return visits(r, BIG, 0);
    case "sermons": return sermonPlays(r, BIG);
    case "searches": return searches(r, BIG);
    case "filters": return searchFilters(r, BIG);
    case "missing": return notFound(r, BIG);
    case "clicks-download": return clicks(r, "download", BIG);
    case "clicks-outbound": return clicks(r, "outbound", BIG);
    case "clicks-internal": return clicks(r, "internal", BIG);
    case "clicks-button": return clicks(r, "button", BIG);
    case "clicks-contact": return [...(await clicks(r, "phone", BIG)), ...(await clicks(r, "email", BIG))];
    default: return undefined;
  }
}

export async function GET(request: Request) {
  await requireTool("analytics");
  const url = new URL(request.url);
  const key = (RANGES.find((r) => r.key === url.searchParams.get("range"))?.key ?? "30d") as RangeKey;
  const name = url.searchParams.get("report") ?? "";
  const { current } = rangeFor(key);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  const headers = {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="smithton-${name.replace(/[^a-z-]/g, "")}-${key}-${day}.csv"`,
    "cache-control": "private, no-store",
  };

  if (name === "events") {
    // Streamed a page at a time, as there may be a lot.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let columns: string[] | undefined;
          for await (const rows of allEvents(current)) {
            if (!columns) {
              columns = Object.keys(rows[0]);
              controller.enqueue(encoder.encode("\uFEFF" + columns.join(",") + "\r\n"));
            }
            controller.enqueue(encoder.encode(rows.map((r) => columns!.map((k) => cell(r[k])).join(",")).join("\r\n") + "\r\n"));
          }
          if (!columns) controller.enqueue(encoder.encode("\uFEFFNo events in this period\r\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
    return new Response(stream, { headers });
  }

  try {
    const rows = await report(name, current);
    if (!rows) return new Response("Unknown report", { status: 404 });
    return new Response("﻿" + toCsv(rows), { headers });
  } catch (error) {
    console.error("Analytics CSV failed", error);
    return new Response("Couldn’t make the CSV. Has the analytics setup script been run?", { status: 500 });
  }
}
