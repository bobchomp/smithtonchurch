"use client";

import { useEffect, useState } from "react";
import type { PublicLiveNotice } from "@/lib/live-notice-types";

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
    <aside className="live-notice" aria-live="polite">
      {notice.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={notice.imageUrl} alt={notice.imageAlt ?? ""} />
      )}
      {(notice.heading || notice.text || notice.link) && (
        <div className="live-notice-body">
          {notice.heading && <h2>{notice.heading}</h2>}
          {notice.text && <p>{notice.text}</p>}
          {notice.link && (
            <a
              className="button"
              href={notice.link.url}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {notice.link.label}
              {external && <span className="visually-hidden"> (opens in a new tab)</span>}
            </a>
          )}
        </div>
      )}
    </aside>
  );
}
