"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LiveNoticeBox from "@/components/LiveNoticeBox";
import { isoToUkTime, type LiveNotice, NOTICE_STYLES, NOTICE_TITLE_SIZES, noticeTitleSize, type NoticeStyle } from "@/lib/live-notice-types";
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
  // The preview is laid out at the Live Services page's real width on a computer (780px of content) and
  // shrunk to fit, so the lines break where they will on the page. On a phone it shows the phone layout.
  const PAGE_WIDTH = 780;
  const frame = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ width?: number; scale: number }>({ width: PAGE_WIDTH, scale: 1 });
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const fit = () => {
      const room = el.clientWidth - 2 * 20; // the frame's padding
      const phone = window.innerWidth < 700;
      setLayout(phone ? { scale: 1 } : { width: PAGE_WIDTH, scale: Math.min(1, room / PAGE_WIDTH) });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // What the preview shows, kept in step with the form as it's filled in.
  const [draft, setDraft] = useState({
    style: (notice?.style ?? "info") as NoticeStyle,
    titleSize: noticeTitleSize(notice?.titleSize),
    heading: notice?.heading ?? "",
    text: notice?.text ?? "",
    alt: notice?.image?.alt ?? "",
    linkLabel: notice?.link?.label ?? "",
    linkUrl: notice?.link?.url ?? "",
  });
  function updateDraft(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "");
    setDraft({
      style: text("style") === "warning" ? "warning" : "info",
      titleSize: noticeTitleSize(text("titleSize")),
      heading: text("heading").trim(),
      text: text("text").trim(),
      alt: text("imageAlt"),
      linkLabel: text("linkLabel").trim(),
      linkUrl: text("linkUrl").trim(),
    });
  }

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
        style: text("style"),
        titleSize: text("titleSize"),
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
  const previewNotice = {
    style: draft.style,
    titleSize: draft.titleSize,
    heading: draft.heading,
    text: draft.text,
    ...(showImage ? { imageUrl: showImage, imageAlt: draft.alt } : {}),
    ...(draft.linkLabel && draft.linkUrl ? { link: { label: draft.linkLabel, url: draft.linkUrl } } : {}),
  };
  const empty = !previewNotice.heading && !previewNotice.text && !showImage;

  return (
    <div className="notice-editor">
    <section className="admin-panel">
    <form className="admin-form" onSubmit={handleSubmit} onChange={(e) => updateDraft(e.currentTarget)} onInput={(e) => updateDraft(e.currentTarget)}>
      <fieldset className="admin-notice-styles">
        <legend>Box colour</legend>
        {NOTICE_STYLES.map((s) => (
          <label key={s.key} className={`admin-notice-style admin-notice-style-${s.key}`}>
            <input type="radio" name="style" value={s.key} defaultChecked={(notice?.style ?? "info") === s.key} />
            {s.label}
          </label>
        ))}
      </fieldset>
      <label>
        <span>
          Heading <span className="admin-optional">(optional)</span>
        </span>
        <input type="text" name="heading" defaultValue={notice?.heading} maxLength={150} />
      </label>
      <fieldset className="admin-notice-sizes">
        <legend>Title size</legend>
        {NOTICE_TITLE_SIZES.map((s) => (
          <label key={s.key} className="admin-checkbox">
            <input type="radio" name="titleSize" value={s.key} defaultChecked={noticeTitleSize(notice?.titleSize) === s.key} />
            {s.label}
          </label>
        ))}
      </fieldset>
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
    </section>

    <aside className="notice-preview" aria-label="Preview">
      <h2>Preview</h2>
      <p className="admin-muted">How it will look on the Live Services page, above the player. It changes as you type.</p>
      <div className="notice-preview-page" ref={frame}>
        <div className="notice-preview-scale" style={{ width: layout.width, zoom: layout.scale }}>
        <p className="section-intro">Sunday services are streamed live. Can’t join us in person? Watch along here.</p>
        {empty ? (
          <p className="notice-preview-empty">Add a heading, a message or an image to see the notice here.</p>
        ) : (
          <LiveNoticeBox notice={previewNotice} preview />
        )}
        <div className="notice-preview-player" aria-hidden="true">Live stream player</div>
        </div>
      </div>
    </aside>
    </div>
  );
}
