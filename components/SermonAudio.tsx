"use client";

import { useRef } from "react";
import { progressMilestones, track } from "@/lib/track";

// The sermon's audio player. Reports to the website statistics when someone starts listening and
// how far they get (only if tracking is on and they haven't opted out).
export default function SermonAudio({ src, title }: { src: string; title: string }) {
  const started = useRef(false);
  const milestones = useRef(progressMilestones((pct) => track({ t: "media", k: "audio", h: location.pathname, l: title, pc: pct })));
  return (
    <audio
      controls
      preload="metadata"
      src={src}
      onPlay={() => {
        if (started.current) return;
        started.current = true;
        track({ t: "media", k: "audio", h: location.pathname, l: title, pc: 0 });
      }}
      onTimeUpdate={(e) => started.current && milestones.current(e.currentTarget.currentTime, e.currentTarget.duration)}
    >
      <a href={src}>Download the sermon audio</a>
    </audio>
  );
}
