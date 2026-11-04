"use client";

import { useState } from "react";

// Shows the video's thumbnail with a play button, and only loads YouTube's player (in its
// privacy-enhanced, no-cookie mode) when someone presses play.
export default function YouTubePlayer({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="youtube-player">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" className="youtube-player-start" onClick={() => setPlaying(true)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" />
          <span className="youtube-player-icon" aria-hidden="true" />
          <span className="visually-hidden">Play the video: {title}</span>
        </button>
      )}
    </div>
  );
}
