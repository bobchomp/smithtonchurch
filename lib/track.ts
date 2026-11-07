// Sends an analytics event from anywhere on the public pages (sermon plays, searches...).
// components/Analytics.tsx picks it up and sends it, but only if tracking is on and the visitor
// hasn't opted out; otherwise it does nothing. Safe to call on the server (it does nothing there).
export type TrackEvent = {
  t: "media" | "search";
  k?: string;
  h?: string;
  l?: string;
  pc?: number;
  n?: number;
  f?: Record<string, string>;
};

export function track(event: TrackEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<TrackEvent>("sc-track", { detail: event }));
}

// Calls back with 0, 25, 50, 75 and 95 (finished) as a player reaches each point, once each.
export function progressMilestones(report: (pct: number) => void) {
  const sent = new Set<number>();
  return (current: number, duration: number) => {
    if (!duration || !Number.isFinite(duration)) return;
    const pct = (current / duration) * 100;
    for (const m of [25, 50, 75, 95]) {
      if (pct >= m && !sent.has(m)) {
        sent.add(m);
        report(m);
      }
    }
  };
}
