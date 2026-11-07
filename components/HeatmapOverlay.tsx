"use client";

import { useEffect, useRef } from "react";
import { ADMIN_HOST } from "@/lib/domains";

// Draws a click heatmap over this page when Admin → Analytics shows it in a frame (?sc-heatmap=1).
// The admin page sends the clicks with postMessage; only the admin panel's address (or this
// site's own) is listened to. Nothing here is sent anywhere or counted.

export type HeatmapClick = { sel: string; fx: number; fy: number };
export type HeatmapMessage = {
  type: "sc-heatmap";
  clicks: HeatmapClick[];
  reach: { pct: number; share: number }[]; // share of page views that scrolled this far (0-1)
  viewport: number; // typical screen height for this size, to place the scroll lines
};

const allowed = (origin: string) => {
  try {
    return origin === location.origin || new URL(origin).hostname === ADMIN_HOST;
  } catch {
    return false;
  }
};

export default function HeatmapOverlay() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let last: { data: HeatmapMessage; reply: (m: unknown) => void } | undefined;
    let drawnHeight = 0;

    const draw = () => {
      const root = layer.current;
      if (!root || !last) return;
      const { data, reply } = last;
      const width = document.documentElement.scrollWidth;
      const height = document.documentElement.scrollHeight;
      drawnHeight = height;
      root.style.width = `${width}px`;
      root.style.height = `${height}px`;
      root.replaceChildren();

      const canvas = document.createElement("canvas");
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.cssText = `position:absolute;inset:0;width:${width}px;height:${height}px`;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(ratio, ratio);
      // Each click adds a soft red spot; where many overlap the colour builds up.
      const radius = width < 600 ? 22 : 30;
      const alpha = Math.max(0.08, Math.min(0.35, 6 / Math.sqrt(data.clicks.length + 1)));
      let placed = 0;
      const cache = new Map<string, Element | null>();
      for (const c of data.clicks) {
        if (!cache.has(c.sel)) {
          let el: Element | null = null;
          try {
            el = document.querySelector(c.sel);
          } catch {}
          cache.set(c.sel, el);
        }
        const el = cache.get(c.sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) continue;
        const x = r.left + window.scrollX + c.fx * r.width;
        const y = r.top + window.scrollY + c.fy * r.height;
        const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
        g.addColorStop(0, `rgba(214, 40, 40, ${alpha})`);
        g.addColorStop(1, "rgba(214, 40, 40, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        placed++;
      }
      root.append(canvas);

      // Scroll lines: how many page views got this far down.
      const view = Math.min(data.viewport, height);
      for (const step of data.reach) {
        if (step.pct === 0) continue;
        const y = Math.round(view + (step.pct / 100) * Math.max(0, height - view));
        const line = document.createElement("div");
        line.className = "sc-heatmap-line";
        line.style.top = `${Math.min(y, height - 2)}px`;
        const label = document.createElement("span");
        label.textContent = `${Math.round(step.share * 100)}% scrolled this far`;
        line.append(label);
        root.append(line);
      }
      reply({ type: "sc-heatmap-drawn", height, placed, missing: data.clicks.length - placed });
    };

    const onMessage = (event: MessageEvent) => {
      if (!allowed(event.origin) || event.data?.type !== "sc-heatmap") return;
      const source = event.source as Window | null;
      last = { data: event.data as HeatmapMessage, reply: (m) => source?.postMessage(m, event.origin) };
      draw();
    };
    window.addEventListener("message", onMessage);

    // Pictures and fonts can change the page's height after it loads: redraw when it does.
    const resized = new ResizeObserver(() => {
      if (last && Math.abs(document.documentElement.scrollHeight - drawnHeight) > 4) draw();
    });
    resized.observe(document.body);
    // Lazy pictures: load them all, as the whole page is shown at once.
    document.querySelectorAll("img[loading=lazy]").forEach((img) => img.setAttribute("loading", "eager"));
    document.documentElement.classList.add("sc-heatmap-page");
    window.parent.postMessage({ type: "sc-heatmap-ready" }, "*");
    return () => {
      window.removeEventListener("message", onMessage);
      resized.disconnect();
    };
  }, []);

  return <div ref={layer} className="sc-heatmap" aria-hidden="true" />;
}
