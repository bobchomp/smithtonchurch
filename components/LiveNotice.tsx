"use client";

import { useEffect, useState } from "react";
import type { PublicLiveNotice } from "@/lib/live-notice-types";
import ExternalIcon from "./ExternalIcon";

// The "i" (information) symbol shown before each notice's title.
function InfoIcon() {
  return (
    <svg className="live-notice-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 10.5v6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="7.2" r="1.4" fill="currentColor" />
    </svg>
  );
}

// The notice set in Admin → Live Notices, above the player. Checked when the page opens and every
// minute after, so it appears and disappears on time for people already watching.
export default function LiveNotice() {
  const [notice, setNotice] = useState<PublicLiveNotice | null>(null);

  useEffect(() => {
    let stopped = false;
    async function check() {
      try {
        const response = await fetch("/api/live-notice/", { cache: "no-store" });
        if (!response.ok) return;
        const { notice } = (await response.json()) as { notice: PublicLiveNotice | null };
        if (!stopped) setNotice(notice);
      } catch {
        // Offline for a moment: keep whatever is showing.
      }
    }
    check();
    const timer = setInterval(check, 60_000);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!notice) return null;
  const external = notice.link && /^https?:\/\//.test(notice.link.url);
  return (
    <aside className={`live-notice live-notice-${notice.style === "warning" ? "warning" : "info"}`} aria-live="polite">
      {notice.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={notice.imageUrl} alt={notice.imageAlt ?? ""} />
      )}
      {(notice.heading || notice.text || notice.link) && (
        <div className="live-notice-body">
          {notice.heading ? (
            <h2 className="live-notice-title">
              <InfoIcon />
              <span>{notice.heading}</span>
            </h2>
          ) : null}
          {notice.text && (
            <p className={notice.heading ? undefined : "live-notice-title live-notice-title-text"}>
              {!notice.heading && <InfoIcon />}
              <span>{notice.text}</span>
            </p>
          )}
          {notice.link && (
            <a
              className="button"
              href={notice.link.url}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {external && <ExternalIcon />}
              {notice.link.label}
              {external && <span className="visually-hidden"> (opens in a new tab)</span>}
            </a>
          )}
        </div>
      )}
    </aside>
  );
}
