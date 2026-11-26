"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { finishHoldingVideoMove, startHoldingVideoUpload } from "./actions";

// Sends a file straight from the browser to Supabase, reporting how far it's got.
function uploadFile(url: string, file: Blob, onProgress: (fraction: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("content-type", file.type);
    request.setRequestHeader("x-upsert", "true");
    request.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    request.onload = () => (request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`storage replied with ${request.status}`)));
    request.onerror = () => reject(new Error("the connection failed"));
    request.send(file);
  });
}

// For the owner: copies the holding videos from the website's own files into file storage, one at a time.
export default function MoveVideos({ files }: { files: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function move() {
    setBusy(true);
    setError(null);
    const done: string[] = [];
    try {
      for (const [i, name] of files.entries()) {
        const label = `${i + 1} of ${files.length}: ${name}`;
        setStatus(`Fetching ${label}`);
        const response = await fetch(`/holding-videos/${name}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Couldn’t fetch ${name} from the website (${response.status}).`);
        const blob = await response.blob();
        const typed = new Blob([blob], { type: name.endsWith(".mp4") ? "video/mp4" : "image/jpeg" });
        const start = await startHoldingVideoUpload(name);
        if ("error" in start) throw new Error(start.error);
        await uploadFile(start.url, typed, (f) => setStatus(`Uploading ${label} (${Math.round(f * 100)}%)`)).catch((e: Error) => {
          throw new Error(`Couldn’t upload ${name}: ${e.message}.`);
        });
        done.push(name);
      }
      setStatus("All moved.");
    } catch (e) {
      setError((e as Error).message);
      setStatus(null);
    } finally {
      if (done.length) await finishHoldingVideoMove(done).catch(() => undefined);
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <section className="admin-panel">
      <h2>Move the videos to file storage</h2>
      <p>
        {files.length} video file{files.length === 1 ? " is" : "s are"} still kept with the website’s code. Moving them to
        file storage keeps the website small. Keep this page open until it says it’s finished: it can take a few minutes.
        Their links change once they’ve moved, so copy them again afterwards.
      </p>
      <p>
        <button type="button" className="button" onClick={move} disabled={busy}>
          {busy ? "Moving…" : "Move videos to file storage"}
        </button>
      </p>
      {status && <p className="admin-muted" aria-live="polite">{status}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
    </section>
  );
}
