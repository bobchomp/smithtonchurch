import type { PublicLiveNotice } from "@/lib/live-notice-types";
import ExternalIcon from "./ExternalIcon";

// The "i" (information) symbol shown before each notice's title.
function InfoIcon() {
  return (
    <svg className="live-notice-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 10.5v6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="7.2" r="1.4" fill="currentColor" />
    </svg>
  );
}

// How a live notice looks: on the Live Services page (LiveNotice) and in the admin editor's preview.
export default function LiveNoticeBox({ notice, preview = false }: { notice: PublicLiveNotice; preview?: boolean }) {
  const external = notice.link && /^https?:\/\//.test(notice.link.url);
  return (
    <aside className={`live-notice live-notice-${notice.style === "warning" ? "warning" : "info"}`} aria-live={preview ? undefined : "polite"}>
      {notice.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={notice.imageUrl} alt={notice.imageAlt ?? ""} />
      )}
      {(notice.heading || notice.text || notice.link) && (
        <div className="live-notice-body">
          {notice.heading ? (
            <h2 className={`live-notice-title live-notice-title-${notice.titleSize ?? "large"}`}>
              <InfoIcon />
              <span>{notice.heading}</span>
            </h2>
          ) : null}
          {notice.text && (
            <p className={notice.heading ? undefined : "live-notice-title live-notice-title-text"}>
              {!notice.heading && <InfoIcon />}
              <span>{notice.text}</span>
            </p>
          )}
          {notice.link && (
            <a
              className="button"
              href={notice.link.url}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              {...(preview ? { onClick: (e: React.MouseEvent) => e.preventDefault() } : {})}
            >
              {external && <ExternalIcon />}
              {notice.link.label}
              {external && <span className="visually-hidden"> (opens in a new tab)</span>}
            </a>
          )}
        </div>
      )}
    </aside>
  );
}
