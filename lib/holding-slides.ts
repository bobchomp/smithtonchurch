import versesV1 from "@/content/holding-video-verses-v1.json";
import versesV2 from "@/content/holding-video-verses-v2.json";

// The holding slides made for the live stream (shown in the player before and after services),
// with every revision. Shown in Admin → Holding Slides. The images are in holding-slides/ (not
// public): <slide>/<file>.png at 1920×1080, with a smaller .jpg preview of each.
// To add a revision: add its files to the slide's folder and a new entry at the end of `revisions`.

export type SlideRevision = {
  version: number;
  date: string; // UK time, "YYYY-MM-DDTHH:MM"
  changes: string;
  files: { file: string; label?: string }[]; // more than one when there were alternative designs
};

export type HoldingSlide = { key: string; title: string; use: string; revisions: SlideRevision[] };

export const HOLDING_SLIDES: HoldingSlide[] = [
  {
    key: "broadcast-shortly",
    title: "The service will be broadcast shortly",
    use: "Before the stream starts",
    revisions: [
      {
        version: 1,
        date: "2026-11-05T12:40",
        changes: "First version, in two designs: the website’s blue, and the aerial photo. Both had “Thank you for joining us online” and the tagline along the bottom.",
        files: [{ file: "v1-blue", label: "Blue" }, { file: "v1-photo", label: "Aerial photo" }],
      },
      {
        version: 2,
        date: "2026-11-05T12:41",
        changes: "Removed the tagline along the bottom (it’s already in the logo), and the circles from the photo design.",
        files: [{ file: "v2-blue", label: "Blue" }, { file: "v2-photo", label: "Aerial photo" }],
      },
      {
        version: 3,
        date: "2026-11-05T12:42",
        changes: "Went with the aerial photo design, and removed “Thank you for joining us online”.",
        files: [{ file: "v3" }],
      },
      {
        version: 4,
        date: "2026-11-05T13:05",
        changes: "Moved the logo and text higher, so they sit in the middle of the part the player’s controls don’t cover.",
        files: [{ file: "v4" }],
      },
    ],
  },
  {
    key: "service-starting-shortly",
    title: "The service will start shortly",
    use: "Just before the service begins",
    revisions: [
      { version: 1, date: "2026-11-05T12:52", changes: "First version, matching “The service will be broadcast shortly”.", files: [{ file: "v1" }] },
      { version: 2, date: "2026-11-05T13:05", changes: "Moved the logo and text higher, like the others.", files: [{ file: "v2" }] },
    ],
  },
  {
    key: "thank-you-morning",
    title: "Thank you for joining our service this morning",
    use: "After the morning service (“Join us again this evening at 17:30”)",
    revisions: [
      { version: 1, date: "2026-11-05T12:52", changes: "First version, with “Join us again this evening at 17:30” underneath.", files: [{ file: "v1" }] },
      { version: 2, date: "2026-11-05T13:05", changes: "Moved the logo and text higher, like the others.", files: [{ file: "v2" }] },
    ],
  },
  {
    key: "thank-you-evening",
    title: "Thank you for joining our service this evening",
    use: "After the evening service (“Join us again next week at 10:30 and 17:30”)",
    revisions: [
      { version: 1, date: "2026-11-05T12:52", changes: "First version, with “Join us again next week at 10:30 and 17:30” underneath.", files: [{ file: "v1" }] },
      { version: 2, date: "2026-11-05T13:05", changes: "Moved the logo and text higher, like the others.", files: [{ file: "v2" }] },
    ],
  },
  {
    key: "thank-you-evening-sunday",
    title: "Thank you for joining our service this evening (next: Sunday)",
    use: "After an evening service during the week (“Join us on Sunday at 10:30 and 17:30”)",
    revisions: [
      {
        version: 1,
        date: "2026-11-07T18:15",
        changes: "First version: the same as the evening slide, with “Join us on Sunday at 10:30 and 17:30” underneath.",
        files: [{ file: "v1" }],
      },
    ],
  },
  {
    key: "background",
    title: "Background only",
    use: "Whenever a plain slide is needed: the drone photo with the blue tint, with no words or logo",
    revisions: [
      {
        version: 1,
        date: "2026-11-12T12:00",
        changes: "First version: the same tinted drone photo as the other slides, with nothing on top.",
        files: [{ file: "v1" }],
      },
    ],
  },
];

// Videos for the stream: kept in public/holding-videos/ (too big to send through the admin panel's
// own file route), with a poster picture. See scripts/holding-video/README.md for how they're made.
export type VideoRevision = {
  version: number;
  date: string; // UK time, "YYYY-MM-DDTHH:MM"
  file: string;
  poster: string;
  changes: string;
  verses?: { ref: string; text: string }[];
  seconds?: number; // how long each verse shows
};
export type HoldingVideo = { key: string; title: string; use: string; revisions: VideoRevision[] };

export const HOLDING_VIDEOS: HoldingVideo[] = [
  {
    key: "service-starting-shortly-verses",
    title: "The service will start shortly, with Bible verses",
    use: "Playing for the 15 minutes before the service",
    revisions: [
      {
        version: 1,
        date: "2026-11-07T14:30",
        file: "/holding-videos/service-starting-shortly-verses-v1.mp4",
        poster: "/holding-videos/service-starting-shortly-verses-v1.jpg",
        changes:
          "First version: 15 minutes, 1920×1080. The logo and title stay in place, moved up a little, while 45 Bible verses (NIV) change underneath, each for 20 seconds with a one-second fade. It loops smoothly.",
        verses: versesV1,
        seconds: 20,
      },
      {
        version: 2,
        date: "2026-11-07T15:30",
        file: "/holding-videos/service-starting-shortly-verses-v2.mp4",
        poster: "/holding-videos/service-starting-shortly-verses-v2.jpg",
        changes:
          "Each verse now shows for 10 seconds, so there are 90 verses (the first 45 plus 45 shorter ones), with quicker fades. Still 15 minutes, and it still loops smoothly.",
        verses: versesV2,
        seconds: 10,
      },
    ],
  },
];

export const slideFileUrl = (slide: string, file: string, kind: "png" | "jpg") => `/admin/holding-slides/file/${slide}/${file}.${kind}`;
