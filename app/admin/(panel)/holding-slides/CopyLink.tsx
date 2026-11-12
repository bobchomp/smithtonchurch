"use client";

import { useState } from "react";

// Copies a slide's or video's public address (shown in full when copying isn't possible).
export default function CopyLink({ path, className }: { path: string; className?: string }) {
  const [state, setState] = useState<"" | "copied" | "failed">("");
  const url = () => `${window.location.protocol}//${window.location.host.replace(/^admin\./, "www.")}${path}`;
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() =>
          navigator.clipboard.writeText(url()).then(
            () => {
              setState("copied");
              setTimeout(() => setState(""), 1800);
            },
            () => setState("failed"),
          )
        }
      >
        {state === "copied" ? "Link copied" : "Copy link"}
      </button>
      {state === "failed" && <input className="slides-link-text" readOnly value={url()} onFocus={(e) => e.currentTarget.select()} aria-label="Link" />}
    </>
  );
}
