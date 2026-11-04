"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { streamSlot, youtubeThumbnail, type Livestream } from "@/lib/livestream-match";
import { formatSermonDate } from "@/lib/sermon-types";
import { createSermonsFromLivestreams } from "./actions";

// Livestreams that have no sermon yet, with tick boxes to create sermons for several at once.
export default function UnmatchedStreams({ streams }: { streams: Livestream[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const allSelected = streams.length > 0 && selected.size === streams.length;
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function create() {
    setBusy(true);
    setMessage(null);
    const result = await createSermonsFromLivestreams([...selected]);
    setBusy(false);
    if (result.created) {
      setMessage({ ok: true, text: `Created ${result.created} sermon${result.created === 1 ? "" : "s"}. They’re now on the website.` });
      setSelected(new Set());
      router.refresh();
    } else {
      setMessage({ ok: false, text: result.error ?? "Something went wrong." });
    }
  }

  return (
    <div className="admin-unmatched">
      <h3>Livestreams without a sermon ({streams.length})</h3>
      <div className="admin-bulk-bar">
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(box) => {
              if (box) box.indeterminate = selected.size > 0 && !allSelected;
            }}
            onChange={() => setSelected(allSelected ? new Set() : new Set(streams.map((s) => s.id)))}
          />
          {allSelected ? "Deselect all" : "Select all"}
        </label>
        <button className="button" type="button" disabled={busy || selected.size === 0} onClick={create}>
          {busy ? "Creating…" : `Create ${selected.size || ""} sermon${selected.size === 1 ? "" : "s"}`.replace("  ", " ")}
        </button>
      </div>
      {message && <p className={message.ok ? "admin-success" : "admin-error"} role="status">{message.text}</p>}

      <ul className="admin-list admin-unmatched-list">
        {streams.map((stream) => {
          const { date, service } = streamSlot(stream);
          return (
            <li key={stream.id}>
              <label className="admin-list-item admin-checkbox">
                <input type="checkbox" checked={selected.has(stream.id)} onChange={() => toggle(stream.id)} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="admin-video-thumb" src={youtubeThumbnail(stream.id)} alt="" width={64} height={36} loading="lazy" />
                <span>
                  {stream.title}
                  <span className="admin-muted">
                    {" · "}
                    {stream.preacher ?? "no preacher in the description"} · {formatSermonDate(date)} (
                    {service === "am" ? "morning" : "evening"})
                  </span>
                </span>
              </label>
              <span className="admin-row-links">
                <a href={`https://www.youtube.com/watch?v=${stream.id}`} target="_blank" rel="noopener noreferrer">Watch</a>
                <Link href={`/admin/sermons/new/?video=${stream.id}`}>Create one</Link>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
