"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isoToUkTime, type LiveNotice } from "@/lib/live-notice-types";
import { saveNotice, startNoticeImageUpload, type NoticeInput } from "./actions";

// Sends the image straight from the browser to Supabase.
function uploadFile(url: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("content-type", file.type);
    request.setRequestHeader("x-upsert", "false");
    request.onload = () => (request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`storage replied with ${request.status}`)));
    request.onerror = () => reject(new Error("the connection failed"));
    request.send(file);
  });
}

export default function NoticeForm({ notice, imageUrl }: { notice?: LiveNotice; imageUrl?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keepImage, setKeepImage] = useState(Boolean(notice?.image));
  const [preview, setPreview] = useState<string | null>(null);
  // The image already uploaded for the chosen file, so trying again after a mistake doesn't upload it twice.
  const [uploaded, setUploaded] = useState<{ file: File; path: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "");
    const file = data.get("image") as File | null;
    const alt = text("imageAlt");
    setError(null);
    setBusy(true);
    try {
      let image: NoticeInput["image"] = keepImage && notice?.image ? { path: notice.image.path, alt } : null;
      if (file && file.size > 0) {
        if (uploaded?.file === file) {
          image = { path: uploaded.path, alt };
        } else {
          const upload = await startNoticeImageUpload(file.type, file.size);
          if (!upload.url || !upload.path) throw new Error(upload.error);
          await uploadFile(upload.url, file);
          setUploaded({ file, path: upload.path });
          image = { path: upload.path, alt };
        }
      }
      const result = await saveNotice(notice?.id ?? null, {
        heading: text("heading"),
        text: text("text"),
        image,
        linkLabel: text("linkLabel"),
        linkUrl: text("linkUrl"),
        startsAt: text("startsAt"),
        endsAt: text("endsAt"),
      });
      if (result.error) throw new Error(result.error);
      router.push("/admin/live-notices/?saved=1");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const showImage = preview ?? (keepImage ? imageUrl : undefined);

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label>
        <span>
          Heading <span className="admin-optional">(optional)</span>
        </span>
        <input type="text" name="heading" defaultValue={notice?.heading} maxLength={150} />
      </label>
      <label>
        <span>
          Message <span className="admin-optional">(optional)</span>
        </span>
        <textarea name="text" defaultValue={notice?.text} rows={4} maxLength={2000} />
      </label>

      <fieldset className="admin-books">
        <legend>
          Image <span className="admin-optional">(optional, JPG, PNG or WebP)</span>
        </legend>
        {showImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="admin-notice-image" src={showImage} alt="" />
        )}
        {notice?.image && !preview && (
          <label className="admin-checkbox">
            <input type="checkbox" checked={!keepImage} onChange={(e) => setKeepImage(!e.target.checked)} />
            Remove this image
          </label>
        )}
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
        {(showImage || preview) && (
          <label>
            Describe the image <span className="admin-optional">(read out to people who can’t see it)</span>
            <input type="text" name="imageAlt" defaultValue={notice?.image?.alt} maxLength={300} required />
          </label>
        )}
      </fieldset>

      <div className="admin-month-year admin-pair">
        <label>
          <span>
            Button text <span className="admin-optional">(optional)</span>
          </span>
          <input type="text" name="linkLabel" defaultValue={notice?.link?.label} maxLength={60} placeholder="e.g. Order of service" />
        </label>
        <label>
          <span>
            Button link <span className="admin-optional">(optional)</span>
          </span>
          <input type="text" name="linkUrl" defaultValue={notice?.link?.url} placeholder="https://…" inputMode="url" />
        </label>
      </div>

      <div className="admin-month-year admin-pair">
        <label>
          <span>
            Show from <span className="admin-optional">(UK time)</span>
          </span>
          <input type="datetime-local" name="startsAt" defaultValue={isoToUkTime(notice?.startsAt)} />
          <span className="admin-muted">Leave empty to show straight away.</span>
        </label>
        <label>
          <span>
            Show until <span className="admin-optional">(UK time)</span>
          </span>
          <input type="datetime-local" name="endsAt" defaultValue={isoToUkTime(notice?.endsAt)} />
          <span className="admin-muted">Leave empty to show until you remove it.</span>
        </label>
      </div>

      {error && (
        <p className="admin-error" role="status">
          {error}
        </p>
      )}
      <button className="button" type="submit" disabled={busy}>
        {busy ? "Saving…" : notice ? "Save changes" : "Add notice"}
      </button>
    </form>
  );
}
