"use client";

import { useEffect, useRef, useState } from "react";
import type { HeatmapClick, HeatmapMessage } from "@/components/HeatmapOverlay";

// Shows a public page in a frame at a phone, tablet or computer width, and has it draw the
// heatmap over itself (components/HeatmapOverlay.tsx). Scaled down to fit the admin page.
export default function HeatmapFrame({
  src,
  origin,
  width,
  viewport,
  clicks,
  reach,
}: {
  src: string;
  origin: string;
  width: number;
  viewport: number;
  clicks: HeatmapClick[];
  reach: { pct: number; share: number }[];
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(900);
  const [scale, setScale] = useState(1);
  const [result, setResult] = useState<{ placed: number; missing: number } | null>(null);

  useEffect(() => {
    const target = origin || location.origin;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== target) return;
      if (event.data?.type === "sc-heatmap-ready") {
        const message: HeatmapMessage = { type: "sc-heatmap", clicks, reach, viewport };
        frame.current?.contentWindow?.postMessage(message, target);
      } else if (event.data?.type === "sc-heatmap-drawn") {
        setHeight(Math.min(30_000, Number(event.data.height) || 900));
        setResult({ placed: Number(event.data.placed) || 0, missing: Number(event.data.missing) || 0 });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin, clicks, reach, viewport]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / width));
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(el);
    return () => watch.disconnect();
  }, [width]);

  return (
    <>
      <p className="admin-muted analytics-note" role="status">
        {result === null
          ? "Loading the page…"
          : `${result.placed} click${result.placed === 1 ? "" : "s"} shown.` +
            (result.missing ? ` ${result.missing} couldn’t be placed (that part of the page has changed, or looks different at this size).` : "")}
      </p>
      <div ref={box} className="analytics-heatmap-fit">
        <div className="analytics-heatmap-box" style={{ width: width * scale, height: height * scale }}>
        <iframe
          ref={frame}
          src={src}
          title="Heatmap"
          className="analytics-heatmap-frame"
          style={{ width, height, transform: `scale(${scale})` }}
          scrolling="no"
        />
        </div>
      </div>
    </>
  );
}
