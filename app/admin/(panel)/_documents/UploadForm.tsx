"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { dateFromFileName, DOCUMENT_TYPES, formatDocumentDate, type DocumentKind } from "@/lib/document-types";
import { renderPdfCover } from "@/lib/pdf-cover";
import { finishDocumentUpload, startDocumentUpload } from "./actions";
import MonthYearSelect from "./MonthYearSelect";

const MAX_MEGABYTES = 25;

// Sends a file straight from the browser to Supabase, reporting progress as it goes.
function uploadFile(url: string, file: Blob, onProgress: (percent: number) => void = () => {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("content-type", file.type);
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`storage replied with ${request.status}`));
    request.onerror = () => reject(new Error("the connection failed"));
    request.send(file);
  });
}

export default function UploadForm({ kind, defaultDate }: { kind: DocumentKind; defaultDate: string }) {
  const { precision, singular } = DOCUMENT_TYPES[kind];
  const router = useRouter();
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  // The date: filled in from the file's name when it has one, and always changeable.
  const [date, setDate] = useState(defaultDate);
  const [fromName, setFromName] = useState<string | null>(null);
  const [dateKey, setDateKey] = useState(0); // remounts the month/year dropdowns when the date is filled in

  function fileChosen(file: File | undefined) {
    const found = file ? dateFromFileName(file.name, precision) : undefined;
    setFromName(found ?? null);
    if (found) {
      setDate(found);
      setDateKey((k) => k + 1);
    }
  }
  const notSunday = precision === "day" && /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(`${date}T12:00:00Z`).getUTCDay() !== 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const date = precision === "day" ? String(data.get("date")) : `${data.get("year")}-${data.get("month")}`;
    const file = data.get("file") as File | null;
    setMessage(null);

    if (!file || file.size === 0) return setMessage({ kind: "error", text: `Please choose the ${singular} PDF.` });
    if (file.type !== "application/pdf") return setMessage({ kind: "error", text: `The ${singular} needs to be a PDF file.` });
    if (file.size > MAX_MEGABYTES * 1024 * 1024) {
      return setMessage({ kind: "error", text: `That file is too big. The limit is ${MAX_MEGABYTES} MB.` });
    }

    setProgress(0);
    try {
      // Picture of the first page for the website. Not essential: without it a standard image is shown.
      const cover = await renderPdfCover(file).catch((error) => {
        console.warn("Couldn’t make a cover picture from the PDF", error);
        return null;
      });
      const { uploadUrls, error } = await startDocumentUpload(kind, date);
      if (!uploadUrls) throw new Error(error);
      await uploadFile(uploadUrls.pdf, file, setProgress);
      if (cover) await uploadFile(uploadUrls.cover, cover).catch(() => undefined);
      await finishDocumentUpload(kind, date);
      form.reset();
      setDate(defaultDate);
      setFromName(null);
      setDateKey((k) => k + 1);
      setMessage({ kind: "success", text: `${singular[0].toUpperCase()}${singular.slice(1)} uploaded. It’s now live on the website.` });
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: `The upload didn’t work: ${(error as Error).message}` });
    } finally {
      setProgress(null);
    }
  }

  const uploading = progress !== null;
  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label>
        {`${singular[0].toUpperCase()}${singular.slice(1)} PDF`}
        <input type="file" name="file" accept="application/pdf,.pdf" required onChange={(e) => fileChosen(e.target.files?.[0])} />
      </label>
      {precision === "day" ? (
        <label>
          Sunday it’s for
          <input type="date" name="date" value={date} onChange={(e) => { setDate(e.target.value); setFromName(null); }} required />
        </label>
      ) : (
        <MonthYearSelect key={dateKey} defaultValue={date} />
      )}
      {fromName && (
        <p className="admin-muted admin-date-note" role="status">
          Filled in from the file name: {formatDocumentDate(kind, fromName)}.{notSunday && " That isn’t a Sunday, so please check it."}
        </p>
      )}
      {message && (
        <p className={message.kind === "error" ? "admin-error" : "admin-success"} role="status">
          {message.text}
        </p>
      )}
      <button className="button" type="submit" disabled={uploading}>
        {uploading ? `Uploading… ${progress}%` : `Upload ${singular}`}
      </button>
    </form>
  );
}
