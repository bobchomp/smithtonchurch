import type { Sermon } from "@/lib/sermon-types";

// Preacher and series names already used, most-used first, to suggest in the form.
export function namesByUse(sermons: Sermon[], pick: (s: Sermon) => string | undefined): string[] {
  const counts = new Map<string, number>();
  for (const s of sermons) {
    const name = pick(s);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
}

// The most recent Sunday (or today, if it's Sunday), in UK time, as YYYY-MM-DD.
export function lastSunday(): string {
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  today.setDate(today.getDate() - today.getDay());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}
