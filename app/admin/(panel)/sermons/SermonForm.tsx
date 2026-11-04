"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Sermon, Service } from "@/lib/sermon-types";
import { saveSermon, startAudioUpload, type SermonInput } from "./actions";

const MAX_MEGABYTES = 300;

// Sends the MP3 straight to the audio storage with the headers its upload address was signed with.
function uploadFile(
  upload: { url: string; headers: Record<string, string> },
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", upload.url);
    for (const [name, value] of Object.entries(upload.headers)) request.setRequestHeader(name, value);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`storage replied with ${request.status}`));
    request.onerror = () => reject(new Error("the connection failed (check the bucket’s CORS settings)"));
    request.send(file);
  });
}

// How long an MP3 is, read in the browser. Not essential.
function audioDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    const done = (value?: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? Math.round(audio.duration) : undefined);
    audio.onerror = () => done(undefined);
    setTimeout(() => done(undefined), 10_000);
    audio.src = url;
  });
}

export default function SermonForm({
  sermon,
  preachers,
  seriesNames,
  audioReady,
  defaultDate,
}: {
  sermon?: Sermon;
  preachers: string[];
  seriesNames: string[];
  audioReady: boolean;
  defaultDate: string;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const busy = progress !== null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "");
    const input: SermonInput = {
      title: text("title"),
      date: text("date"),
      service: text("service") as Service,
      preacher: text("preacher"),
      series: text("series"),
      passage: text("passage"),
      videoUrl: text("videoUrl"),
    };
    const file = data.get("audio") as File | null;
    setMessage(null);

    if (file && file.size > 0) {
      if (!/\.mp3$/i.test(file.name) && file.type !== "audio/mpeg") return setMessage({ kind: "error", text: "The audio needs to be an MP3 file." });
      if (file.size > MAX_MEGABYTES * 1024 * 1024) return setMessage({ kind: "error", text: `That file is too big. The limit is ${MAX_MEGABYTES} MB.` });
    }

    setProgress(0);
    try {
      if (file && file.size > 0) {
        const { upload, key, error } = await startAudioUpload(input.date, input.service, input.title, input.preacher);
        if (!upload || !key) throw new Error(error);
        const [duration] = await Promise.all([audioDuration(file), uploadFile(upload, file, setProgress)]);
        input.audio = { key, size: file.size, duration };
      }
      const result = await saveSermon(sermon?.id ?? null, input);
      if (!result.id) throw new Error(result.error);
      if (sermon) {
        setMessage({ kind: "success", text: "Saved. The changes are now live on the website." });
        router.replace(`/admin/sermons/${sermon.id}/`);
        router.refresh();
      } else {
        router.push(`/admin/sermons/${result.id}/?added=1`);
      }
    } catch (error) {
      setMessage({ kind: "error", text: `That didn’t work: ${(error as Error).message}` });
    } finally {
      setProgress(null);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label>
        Title
        <input type="text" name="title" defaultValue={sermon?.title} required maxLength={200} />
      </label>
      <div className="admin-month-year">
        <label>
          Date
          <input type="date" name="date" defaultValue={sermon?.date ?? defaultDate} required />
        </label>
        <label>
          Service
          <select name="service" defaultValue={sermon?.service ?? "am"}>
            <option value="am">Morning</option>
            <option value="pm">Evening</option>
            <option value="">Other</option>
          </select>
        </label>
      </div>
      <label>
        Preacher
        <input type="text" name="preacher" defaultValue={sermon?.preacher} list="preacher-list" required maxLength={100} />
        <datalist id="preacher-list">
          {preachers.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </label>
      <label>
        Series <span className="admin-optional">(optional)</span>
        <input type="text" name="series" defaultValue={sermon?.series} list="series-list" maxLength={150} />
        <datalist id="series-list">
          {seriesNames.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label>
        Bible passage <span className="admin-optional">(optional, e.g. John 1:1-18)</span>
        <input type="text" name="passage" defaultValue={sermon?.passage} maxLength={100} />
      </label>
      <label>
        Video link <span className="admin-optional">(optional, e.g. the YouTube address)</span>
        <input type="url" name="videoUrl" defaultValue={sermon?.videoUrl} maxLength={300} />
      </label>
      <label>
        {sermon?.audioKey ? "Replace the audio" : "Audio (MP3)"} <span className="admin-optional">(optional)</span>
        <input type="file" name="audio" accept="audio/mpeg,.mp3" disabled={!audioReady} />
        {!audioReady && <span className="admin-muted">Audio uploads will work once Cloudflare R2 is set up.</span>}
      </label>
      {message && (
        <p className={message.kind === "error" ? "admin-error" : "admin-success"} role="status">
          {message.text}
        </p>
      )}
      <button className="button" type="submit" disabled={busy}>
        {busy ? (progress ? `Uploading audio… ${progress}%` : "Saving…") : sermon ? "Save changes" : "Add sermon"}
      </button>
    </form>
  );
}
