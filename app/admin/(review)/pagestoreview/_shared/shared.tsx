// Shared bits for the home page design options in Admin → Pages to Review.
import { site } from "@/lib/content";

export const icon = (d: string, size = 28) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
export const ICONS = {
  play: "M5 4l14 8-14 8z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  doc: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  pin: "M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  live: "M4 7h11v10H4zM15 10l5-3v10l-5-3",
};

export const WELCOME = [
  "Whether you are looking for a spiritual home to learn more about Jesus and what it means to live for him, or for a place to worship while on holiday in the Highland capital, we hope you will find the information you need on this site.",
];

export function MapEmbed({ height = 380 }: { height?: number }) {
  return (
    <iframe
      src={site.maps_embed}
      title="Map showing Smithton Church, Murray Road, Inverness"
      style={{ display: "block", width: "100%", height, border: 0, borderRadius: "var(--radius)" }}
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
