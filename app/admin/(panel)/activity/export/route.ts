import { allActivity } from "@/lib/activity";
import { requireTool } from "@/lib/admin-auth";
import { ukTimeToIso } from "@/lib/live-notice-types";

// The activity log as a CSV file (with the filters chosen on the page).
export const dynamic = "force-dynamic";

const DAYS: Record<string, number> = { today: 1, "7d": 7, "30d": 30 };

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; // so spreadsheets don't run it as a formula
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: Request) {
  await requireTool("activity-log");
  const p = new URL(request.url).searchParams;
  let from: string | undefined;
  const days = DAYS[p.get("period") ?? ""];
  if (days) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (days - 1));
    from = ukTimeToIso(`${d.toISOString().slice(0, 10)}T00:00`);
  }
  const rows = await allActivity({ area: p.get("area") || undefined, actor: p.get("who") || undefined, from });
  const lines = [
    "time,who,area,what,target,details",
    ...rows.map((r) => [r.at, r.actor, r.area, r.action, r.target, r.details].map(cell).join(",")),
  ];
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="smithton-activity-${day}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
