"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { TrackEvent } from "@/lib/track";
import HeatmapOverlay from "./HeatmapOverlay";

// Website analytics for the public pages: page views, time on page, scroll depth and clicks,
// sent to /api/collect. Visitors are told in a small card and can choose "Don't count me".
//
// Cookies (first-party, only used for these statistics):
//   sc_v        a random visitor ID, so returning visitors can be recognised (1 year)
//   sc_s        the current visit; ends after 30 minutes without activity
//   sc_consent  "ok" once the card is dismissed, or "no" for "Don't count me" (1 year)
//   sc_admin    set when signing in to the admin panel: never count this browser
// Cookies are only written once the server confirms tracking is switched on.

const YEAR = 365 * 24 * 60 * 60;
const VISIT = 30 * 60;

function readCookie(name: string): string | undefined {
  return document.cookie.split(/;\s*/).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);
}

function writeCookie(name: string, value: string, maxAge: number) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

type Event = Record<string, string | number | boolean | undefined | Record<string, string>>;

// Admin → Analytics shows each page with ?sc-heatmap=1 to draw its heatmap: never counted.
const heatmapMode = () => new URLSearchParams(location.search).has("sc-heatmap");

function excluded() {
  return readCookie("sc_consent") === "no" || readCookie("sc_admin") === "1" || heatmapMode();
}

// A path to the clicked element (e.g. "#main>section:nth-of-type(2)>a:nth-of-type(1)"), so the
// heatmap can find the same element again, whatever the screen size.
function selectorFor(el: Element): string | undefined {
  const parts: string[] = [];
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (node === document.body) return ["body", ...parts].join(">");
    if (node.id && /^[a-z][\w-]*$/i.test(node.id)) return ["#" + node.id, ...parts].join(">");
    let i = 1;
    for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) if (sib.tagName === node.tagName) i++;
    parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${i})`);
    if (parts.length > 25) return undefined;
  }
  return undefined;
}

// Where a click was: the element and the point within it (0 to 1 across and down).
function clickPosition(event: MouseEvent): Event {
  if (!(event.target instanceof Element) || event.detail === 0) return {}; // keyboard "clicks" have no position
  const r = event.target.getBoundingClientRect();
  const sel = selectorFor(event.target);
  if (!sel || !r.width || !r.height || sel.length > 400) return {};
  return { sel, fx: (event.clientX - r.left) / r.width, fy: (event.clientY - r.top) / r.height };
}

// The kind of thing that was clicked, for the click reports.
function describeClick(target: Element): Event | null {
  const el = target.closest("a, button, [role=button], summary");
  if (!el || el.closest(".cookie-card")) return null;
  const label = (el.getAttribute("aria-label") || (el as HTMLElement).innerText || el.getAttribute("title") || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  if (el instanceof HTMLAnchorElement && el.href) {
    const href = el.getAttribute("href") ?? "";
    let kind = "internal";
    if (href.startsWith("tel:")) kind = "phone";
    else if (href.startsWith("mailto:")) kind = "email";
    else if (/\.(pdf|mp3|docx?|xlsx?|pptx?|zip)(\?|#|$)/i.test(el.href) || el.hasAttribute("download")) kind = "download";
    else if (new URL(el.href).origin !== location.origin) kind = "outbound";
    const url = new URL(el.href);
    const target = kind === "phone" || kind === "email" ? href.split("?")[0] : url.origin === location.origin ? url.pathname + url.search + url.hash : el.href;
    return { t: "click", k: kind, h: target, l: label };
  }
  return { t: "click", k: "button", l: label };
}

// notFound: this is the "page not found" page, so the address is reported as a missing page.
export default function Analytics({ notFound = false }: { notFound?: boolean }) {
  const pathname = usePathname();
  const [showCard, setShowCard] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  useEffect(() => setHeatmap(heatmapMode()), []);
  const state = useRef({ on: false, visitor: "", session: "", page: "", started: 0, active: 0, visibleSince: 0, scroll: 0 });

  // Sends events. Page views use fetch (to hear whether tracking is on); the rest use sendBeacon,
  // which still arrives when the page is closing.
  function send(events: Event[], beacon = false) {
    const s = state.current;
    if (!s.visitor || excluded()) return;
    const w = window.innerWidth;
    const body = JSON.stringify({ v: s.visitor, s: s.session, e: events.map((e) => ({ w, ...e })) });
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon("/api/collect/", new Blob([body], { type: "text/plain" }));
      return Promise.resolve(null);
    }
    return fetch("/api/collect/", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } })
      .then((r) => (r.ok ? (r.json() as Promise<{ on: boolean }>) : null))
      .catch(() => null);
  }

  // Keeps the visit going while someone is active.
  function touchVisit() {
    if (state.current.on) writeCookie("sc_s", state.current.session, VISIT);
  }

  // "Leave" for the page being left: time actively spent on it and how far down they scrolled.
  function sendLeave() {
    const s = state.current;
    if (!s.page || !s.on) return;
    const active = s.active + (s.visibleSince ? Date.now() - s.visibleSince : 0);
    send([{ t: "leave", p: s.page, d: active, sc: s.scroll }], true);
    s.page = "";
  }

  // A new page: send "leave" for the last one and a page view for this one.
  useEffect(() => {
    if (excluded()) return;
    const s = state.current;
    sendLeave();
    const existingVisit = readCookie("sc_s");
    const entry = !existingVisit;
    s.visitor = readCookie("sc_v") || s.visitor || newId();
    s.session = existingVisit || newId();
    s.page = pathname;
    s.active = 0;
    s.visibleSince = document.visibilityState === "visible" ? Date.now() : 0;
    s.scroll = 0;
    const params = new URLSearchParams(location.search);
    const timer = setTimeout(() => {
      const event: Event = { t: "pageview", p: pathname, ti: document.title, w: window.innerWidth, en: entry };
      if (notFound) {
        event.nf = true;
        event.fr = document.referrer || undefined;
      }
      if (entry) {
        event.r = document.referrer || undefined;
        event.us = params.get("utm_source") ?? undefined;
        event.um = params.get("utm_medium") ?? undefined;
        event.uc = params.get("utm_campaign") ?? undefined;
      }
      send([event])?.then((reply) => {
        if (!reply?.on) {
          s.on = false;
          return;
        }
        s.on = true;
        writeCookie("sc_v", s.visitor, YEAR);
        touchVisit();
        if (!readCookie("sc_consent")) setShowCard(true);
      });
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Active time, scroll depth, clicks, and leaving the site.
  useEffect(() => {
    const s = state.current;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max <= 0 ? 100 : Math.round((window.scrollY / max) * 100);
      if (pct > s.scroll) s.scroll = Math.min(100, pct);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (s.visibleSince) s.active += Date.now() - s.visibleSince;
        s.visibleSince = 0;
        sendLeave();
      } else {
        s.visibleSince = Date.now();
        if (!s.page) {
          // Came back to the tab: count the time from here on as part of the same page.
          s.page = location.pathname;
          s.active = 0;
        }
        touchVisit();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!s.on || !(event.target instanceof Element) || event.target.closest(".cookie-card")) return;
      // Links and buttons for the click reports; anything else only for the heatmaps.
      const click = describeClick(event.target) ?? { t: "click", k: "none" };
      send([{ ...click, ...clickPosition(event), p: location.pathname }], true);
      touchVisit();
    };
    // Sermon plays, searches and so on, from track() in lib/track.ts.
    const onTrack = (event: globalThis.Event) => {
      const detail = (event as CustomEvent<TrackEvent>).detail;
      if (s.on && detail) send([{ ...detail, p: location.pathname }], true);
    };
    window.addEventListener("sc-track", onTrack);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("pagehide", sendLeave);
    return () => {
      window.removeEventListener("sc-track", onTrack);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("pagehide", sendLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (heatmap) return <HeatmapOverlay />;
  if (!showCard) return null;
  return (
    <div className="cookie-card" role="region" aria-label="Cookies">
      <p>
        <span aria-hidden="true">🍪 </span>We use cookies to understand how the website is used, so we can improve it.{" "}
        <Link href="/privacy/">Privacy notice</Link>
      </p>
      <button
        type="button"
        className="button"
        onClick={() => {
          writeCookie("sc_consent", "ok", YEAR);
          setShowCard(false);
        }}
      >
        Got it
      </button>
      <button
        type="button"
        className="cookie-card-optout"
        onClick={() => {
          writeCookie("sc_consent", "no", YEAR);
          writeCookie("sc_v", "", 0);
          writeCookie("sc_s", "", 0);
          state.current.on = false;
          setShowCard(false);
        }}
      >
        Don’t count me
      </button>
    </div>
  );
}
