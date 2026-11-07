"use client";

import { useEffect, useRef, useState } from "react";
import { progressMilestones, track } from "@/lib/track";

const PLAYER_ORIGIN = "https://www.youtube-nocookie.com";

// Shows the video's thumbnail with a play button, and only loads YouTube's player (in its
// privacy-enhanced, no-cookie mode) when someone presses play.
// trackAs: on public sermon pages, the sermon title, so plays and how far people watch are counted
// in the website statistics (through the player's postMessage updates; nothing is sent to YouTube).
export default function YouTubePlayer({ id, title, trackAs }: { id: string; title: string; trackAs?: string }) {
  const [playing, setPlaying] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!playing || !trackAs) return;
    const milestones = progressMilestones((pct) => track({ t: "media", k: "video", h: location.pathname, l: trackAs, pc: pct }));
    let duration = 0;
    let heard = false;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== PLAYER_ORIGIN || event.source !== frame.current?.contentWindow) return;
      let data: { info?: { currentTime?: unknown; duration?: unknown } } | undefined;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      heard = true;
      const info = data?.info;
      if (typeof info?.duration === "number" && info.duration > 0) duration = info.duration;
      if (typeof info?.currentTime === "number") milestones(info.currentTime, duration);
    };
    // Ask the player to send its progress; repeat until it answers (it may still be loading).
    let tries = 0;
    const ask = () => {
      if (heard || tries++ > 15) return clearInterval(timer);
      frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), PLAYER_ORIGIN);
    };
    const timer = setInterval(ask, 1000);
    window.addEventListener("message", onMessage);
    return () => {
      clearInterval(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [playing, trackAs]);

  const extra = trackAs ? "&enablejsapi=1" : "";
  return (
    <div className="youtube-player">
      {playing ? (
        <iframe
          ref={frame}
          src={`${PLAYER_ORIGIN}/embed/${id}?autoplay=1&rel=0${extra}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="youtube-player-start"
          onClick={() => {
            setPlaying(true);
            if (trackAs) track({ t: "media", k: "video", h: location.pathname, l: trackAs, pc: 0 });
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" />
          <span className="youtube-player-icon" aria-hidden="true" />
          <span className="visually-hidden">Play the video: {title}</span>
        </button>
      )}
    </div>
  );
}
