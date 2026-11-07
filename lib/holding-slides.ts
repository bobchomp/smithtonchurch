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
];

export const slideFileUrl = (slide: string, file: string, kind: "png" | "jpg") => `/admin/holding-slides/file/${slide}/${file}.${kind}`;
