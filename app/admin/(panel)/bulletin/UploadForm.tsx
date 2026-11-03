"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { renderPdfCover } from "@/lib/pdf-cover";
import { finishBulletinUpload, startBulletinUpload } from "./actions";

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

export default function UploadForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const date = String(data.get("date"));
    const file = data.get("file") as File | null;
    setMessage(null);

    if (!file || file.size === 0) return setMessage({ kind: "error", text: "Please choose the bulletin PDF." });
    if (file.type !== "application/pdf") return setMessage({ kind: "error", text: "The bulletin needs to be a PDF file." });
    if (file.size > MAX_MEGABYTES * 1024 * 1024) {
      return setMessage({ kind: "error", text: `That file is too big. The limit is ${MAX_MEGABYTES} MB.` });
    }

    setProgress(0);
    try {
      // Picture of the first page for the website. Not essential: without it the standard image is shown.
      const cover = await renderPdfCover(file).catch((error) => {
        console.warn("Couldn’t make a cover picture from the PDF", error);
        return null;
      });
      const { uploadUrls, error } = await startBulletinUpload(date);
      if (!uploadUrls) throw new Error(error);
      await uploadFile(uploadUrls.pdf, file, setProgress);
      if (cover) await uploadFile(uploadUrls.cover, cover).catch(() => undefined);
      await finishBulletinUpload();
      form.reset();
      setMessage({ kind: "success", text: "Bulletin uploaded. It’s now live on the website." });
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
        Sunday it’s for
        <input type="date" name="date" defaultValue={defaultDate} required />
      </label>
      <label>
        Bulletin PDF
        <input type="file" name="file" accept="application/pdf,.pdf" required />
      </label>
      {message && (
        <p className={message.kind === "error" ? "admin-error" : "admin-success"} role="status">
          {message.text}
        </p>
      )}
      <button className="button" type="submit" disabled={uploading}>
        {uploading ? `Uploading… ${progress}%` : "Upload bulletin"}
      </button>
    </form>
  );
}
