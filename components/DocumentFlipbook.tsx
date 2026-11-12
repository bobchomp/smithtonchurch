"use client";

import { useEffect, useState } from "react";
import type { DocumentKind } from "@/lib/document-types";
import { Flipbook } from "./Flipbook";

// Fetches a fresh viewer link (they expire, and the page around this is cached) and shows the
// flipbook. If the flipbook can't be used, offers the PDF instead.
export default function DocumentFlipbook({ kind, date, pdfUrl, title, singular }: {
  kind: DocumentKind;
  date: string;
  pdfUrl: string;
  title: string;
  singular: string;
}) {
  const [state, setState] = useState<{ url?: string; failed?: boolean }>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/flipbook/viewer/?${new URLSearchParams({ kind, date })}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { url?: string; off?: boolean }) => {
        if (cancelled) return;
        if (data.off) window.location.replace(pdfUrl); // the flipbook isn't switched on: show the PDF as before
        else setState(data.url ? { url: data.url } : { failed: true });
      })
      .catch(() => !cancelled && setState({ failed: true }));
    return () => {
      cancelled = true;
    };
  }, [kind, date, pdfUrl]);

  // The viewer fills the window below the header, whose height changes with the screen width.
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    const update = () => document.documentElement.style.setProperty("--site-header-h", `${header.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="document-viewer" aria-busy={!state.url && !state.failed}>
      {state.url ? (
        <Flipbook url={state.url} title={title} height="100%" />
      ) : state.failed ? (
        <div className="document-viewer-message">
          <p>The {singular} can’t be shown here just now.</p>
          <a className="button" href={pdfUrl}>Open the {singular} (PDF)</a>
        </div>
      ) : (
        <div className="document-viewer-message">
          <p>Opening the {singular}…</p>
        </div>
      )}
    </div>
  );
}
