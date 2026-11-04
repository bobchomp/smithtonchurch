"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BIBLE_BOOKS, bookFromPassage } from "@/lib/bible";
import { streamSlot, youtubeId, type Livestream } from "@/lib/livestream-match";
import { formatDuration, formatSermonDate, type Sermon, type Service } from "@/lib/sermon-types";
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

const DAY = 24 * 60 * 60 * 1000;

function streamLabel(stream: Livestream): string {
  const { date, service } = streamSlot(stream);
  return `${formatSermonDate(date).replace(/^\w+ /, "")} ${service === "am" ? "morning" : "evening"} · ${stream.title}${
    stream.duration ? ` (${formatDuration(stream.duration)})` : ""
  }`;
}

// Choosing the sermon's YouTube video: automatic, none, a livestream from around the date, or a link.
function VideoField({
  streams,
  date,
  service,
  initial,
}: {
  streams: Livestream[];
  date: string;
  service: Service;
  initial: string;
}) {
  const known = new Set(streams.map((s) => s.id));
  const [choice, setChoice] = useState(initial === "" || initial === "none" || known.has(initial) ? initial : "other");
  const [link, setLink] = useState(choice === "other" ? initial : "");
  const day = Date.parse(`${date}T12:00:00Z`);
  const nearby = Number.isNaN(day)
    ? []
    : streams.filter((s) => Math.abs(Date.parse(s.startedAt) - day) < 10 * DAY || s.id === initial);
  const automatic = streams
    .filter((s) => {
      const slot = streamSlot(s);
      return slot.date === date && slot.service === service;
    })
    .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))[0];

  return (
    <label>
      Video
      <select value={choice} onChange={(e) => setChoice(e.target.value)}>
        <option value="">
          {automatic ? `Automatic: ${streamLabel(automatic)}` : "Automatic (no livestream found for this date and service yet)"}
        </option>
        <option value="none">No video</option>
        {nearby.length > 0 && (
          <optgroup label="Livestreams around this date">
            {nearby.map((s) => (
              <option key={s.id} value={s.id}>{streamLabel(s)}</option>
            ))}
          </optgroup>
        )}
        <option value="other">Another YouTube video…</option>
      </select>
      {choice === "other" && (
        <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste the YouTube link" required />
      )}
      <input type="hidden" name="video" value={choice === "other" ? link : choice} />
      {choice === "other" && link && !youtubeId(link) && <span className="admin-error">That doesn’t look like a YouTube link.</span>}
    </label>
  );
}

export default function SermonForm({
  sermon,
  preachers,
  seriesNames,
  audioReady,
  defaultDate,
  streams,
  prefill,
}: {
  sermon?: Sermon;
  preachers: string[];
  seriesNames: string[];
  audioReady: boolean;
  defaultDate: string;
  streams: Livestream[];
  prefill?: { title: string; date: string; service: Service; video: string; preacher: string; book: string };
}) {
  const router = useRouter();
  const [date, setDate] = useState(sermon?.date ?? prefill?.date ?? defaultDate);
  const [service, setService] = useState<Service>(sermon?.service ?? prefill?.service ?? "am");
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
      book: text("book"),
      video: text("video"),
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
        <input type="text" name="title" defaultValue={sermon?.title ?? prefill?.title} required maxLength={200} />
      </label>
      <div className="admin-month-year">
        <label>
          Date
          <input type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Service
          <select name="service" value={service} onChange={(e) => setService(e.target.value as Service)}>
            <option value="am">Morning</option>
            <option value="pm">Evening</option>
            <option value="">Other</option>
          </select>
        </label>
      </div>
      <label>
        Preacher <span className="admin-optional">(optional)</span>
        <input type="text" name="preacher" defaultValue={sermon?.preacher ?? prefill?.preacher} list="preacher-list" maxLength={100} />
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
        Bible book <span className="admin-optional">(optional)</span>
        <select name="book" defaultValue={sermon?.book ?? bookFromPassage(sermon?.passage) ?? prefill?.book ?? ""}>
          <option value="">Not set</option>
          {BIBLE_BOOKS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </label>
      <VideoField
        streams={streams}
        date={date}
        service={service}
        initial={sermon?.video ?? youtubeId(sermon?.videoUrl) ?? prefill?.video ?? ""}
      />
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
