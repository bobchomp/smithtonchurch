# Notes for Claude

- Next.js (App Router) site deployed on Vercel from `main`. Editable content lives in `content/*.yml`.
- Run `npm run build` before committing; it must pass.
- The owner wants changes to go live automatically: after committing and pushing your working
  branch, merge it into `main` and push `main` (fast-forward where possible). No pull request needed.

## Layout

- `app/(site)/` holds the public pages (header/footer in its layout). They are statically pre-rendered.
- `app/admin/` is the admin panel. `proxy.ts` keeps it on admin.rossmdev.co.uk and redirects
  `/admin` on the main domain there. Domains are set in `lib/domains.ts` (site is on rossmdev.co.uk during development). While SITE_HOST isn't smithtonchurch.com, the whole site is noindex (meta tag + X-Robots-Tag header). Addresses keep the `/admin/` prefix on the subdomain too.
- Admin auth (`lib/admin-auth.ts`, `lib/admin-users.ts`): individual logins in Supabase Auth (email + password). Only users
  with `app_metadata.smithton_role` "owner" or "admin" get in; owners also manage logins (Admin → Users, incl. "Reset password", which emails a reset link) and, in Admin → User Permissions (`app/admin/(panel)/user-permissions/`), each person's role and which tools each admin can use (`lib/admin-tools.ts`,
  `app_metadata.smithton_tools`; missing = all tools). Guard each tool's pages and actions with `requireTool("…")`; new tools
  need adding to ADMIN_TOOLS and a `canUse` check on their dashboard tile. The shared `ADMIN_PIN`
  still works as a backup (counts as an owner; its box is hidden until the login logo is tapped 10 times). Sessions are our own signed cookie (`ADMIN_SESSION_SECRET` or ADMIN_PIN), and the
  user is re-checked in Supabase on each request. Invite/reset emails are sent by us via Resend with links to
  `/admin/set-password/` (token verified with verifyOtp on submit), not by Supabase. Pages inside `app/admin/(panel)/`
  are guarded by its layout, but every server action and route handler must call `requireAdmin()` (or `requireOwner()`) itself.
- Add each new admin tool as a card on `app/admin/(panel)/page.tsx`.
- Admin → Pages to Review (`app/admin/(panel)/pagestoreview/`): drafts for the owner to look at before they go live, at
  `/admin/pagestoreview/<random slug>/` (`app/admin/(review)/pagestoreview/`, listed in `_shared/options.ts`; empty when there's nothing to review). They render with the public
  header/footer behind `requireAdmin()` and noindex. Keep slugs random (not guessable). The live pages are untouched by them.
- Uploaded PDFs (weekly bulletin, Marsali's newsletter) share one system: `lib/document-types.ts` (kinds, dated by
  day or month), `lib/documents.ts` (storage), `app/admin/(panel)/_documents/` (admin) and
  `components/Document*.tsx` (public). Add a new kind to DOCUMENT_TYPES rather than copying code.
  Uploading: the PDF box comes first and the date is filled in from the file name (`dateFromFileName`). If a document already
  exists for that date, `startDocumentUpload` returns it as `existing` and the form shows a popup to keep it or use the new one
  (only one per date; the newer upload replaces the older via `removeReplacedDocuments`).
- Sermons: the list is one JSON file in Supabase Storage (`website/sermons/index.json`, `lib/sermons.ts`);
  audio is in Cloudflare R2 (`lib/r2.ts`, S3 API, browser uploads via presigned PUT). Imported sermons keep
  the old media site's `sermon_id` as their id (< 10000); admin-added ones start at 10001. The import merges into an
  existing admin-added sermon with the same date and service (setting its `legacyId`) instead of duplicating it.
  `scripts/import-media-site.mjs` copies the old archive and is run by the owner locally (the old site is
  http-only, which this environment can't reach). The old site's sermon pages don't show passages, so the import
  gets each sermon's Bible book from its `?book=` filter lists (or the title).
- The livestream player (site.yml `livestream_embed`) is on its own page, /live/ (with this week's bulletin via
  `components/BulletinBox.tsx`); the footer has a "Live Services" button to it, and the menu has "Live Services" (the full desktop menu shows from 1366px; below that the Menu button. Items can be `mobileOnly` in navigation.yml).
- Live Notices (Admin → Live Notices, `lib/live-notices.ts`, `lib/live-notice-types.ts`): scheduled text/image notices above the
  player on /live/. Stored in the private bucket (`live-notices/index.json`, so future ones stay hidden), images in
  `website/live-notices/`. Only one shows: of those on (and not switched off, `off`), the latest start (or added time). The page fetches
  `/api/live-notice/` on load and every minute (30s CDN cache). Admin times are UK time (`ukTimeToIso`).
- Home page (`app/(site)/page.tsx`, styles under "Home" in globals.css): photo hero, welcome with the church photo, This week,
  Find us (contact details + Google map), Free Church of Scotland section, contact form; plus the Church JSON-LD.
- Home page "This week at Smithton" (`components/ThisWeek.tsx`): the latest sermon (thumbnail, no player, links to its
  page) and this week's bulletin (links to /weekly-bulletin/). The home page revalidates hourly and on sermon/bulletin changes.
- Missions: partners with a specific place have a location map (`map`/`map_place` in content/missions.yml, images in
  public/images/missions/maps/, 1000×750, made from Natural Earth data in the site's colours) shown under their photo.
- Each Sunday sermon's page links to that Sunday's bulletin (`bulletinForDate` in lib/documents.ts; weekday services get none);
  uploading or deleting a bulletin refreshes that Sunday's sermon pages.
- Sermons record only Bible books (no chapter/verse), by the owner's choice. A sermon can have several: `books` (array,
  Bible order); `book` and `passage` are legacy fields, so always read them with `sermonBooks()` (lib/sermon-types.ts).
- Admin → Sermons → Fill in details (`app/admin/(panel)/sermons/review/`, `lib/sermon-review.ts`) steps through sermons after
  the old media site's last one (latest imported date, or 15 Feb 2026), not imported and not yet `detailsChecked`, oldest first.
- YouTube livestreams: `lib/youtube.ts` (Data API, YOUTUBE_API_KEY) fetches finished livestreams; `lib/livestreams.ts`
  saves them to `website/livestreams/index.json` (daily via cron-job.org calling `/api/cron/sync-livestreams/` with
  `Authorization: Bearer <CRON_SECRET>`, or "Check YouTube now"). No Vercel cron is used. `lib/livestream-match.ts` matches them to sermons by UK date and service (before 2pm = am);
  a sermon's `video` field overrides ("none" or a YouTube ID). Streams titled "Church Night", "funeral" or "thanksgiving service" are never matched or listed;
  a stream's description is the preacher's name, sometimes after the title on the line above (`preacherFrom` in lib/youtube.ts), used when creating sermons from streams and to fill a blank preacher in the admin forms;
  the Bible book comes from the title via `bookFromTitle` (lib/bible.ts). Pages read the saved list, never YouTube directly.
- Contact form: `components/ContactForm*.tsx` → server action `app/contact-actions.ts` saves each message as its own
  JSON file in the private Supabase bucket `private/messages/` (`lib/messages.ts`), (first + last name, stored as `name`), then emails it via Resend
  (`lib/email.ts`, RESEND_API_KEY, from info@rossmackenzie.co.uk with display name "<Name> (Website)") to the recipients in `private/settings/contact.json`
  (managed in Admin → Messages). Spam: honeypot field + minimum 3s to submit.
- Storage and future data live in Supabase (`lib/supabase.ts`, secret key, server only). Files go in the
  public `website` bucket under a folder per feature (e.g. `bulletins/`). Browsers upload straight to
  Supabase with a signed upload URL from a server action, which avoids Vercel's request size limit.
- SEO: every public page sets its metadata with `pageMetadata(path, {...})` (lib/seo.ts): canonical on site.yml `url`
  (smithtonchurch.com), Open Graph/Twitter tags and the share image `public/images/og-image.jpg` (1200×630). The home page
  has schema.org Church JSON-LD. `app/robots.ts` and `app/sitemap.ts` (includes every sermon). New pages: use pageMetadata
  and add them to the sitemap list.
- Analytics (Admin → Analytics, tool key "analytics"): `components/Analytics.tsx` (in the site layout and not-found) posts
  page views, leave events (active time + scroll %) and clicks to `/api/collect/` (text/plain JSON), which writes rows to the
  Supabase Postgres table `analytics_events` (`lib/analytics.ts`, setup SQL in `supabase/analytics.sql`, run once by the owner
  in the SQL editor; reports are SQL functions called with `rpc`). Off until switched on (`private/settings/analytics.json`).
  Cookies: `sc_v` visitor (1y), `sc_s` visit (30 min), `sc_consent` "no" = opted out, `sc_admin` (set on admin sign-in: never counted).
  Not counted: "Don't count me", admins, bots (Global Privacy Control is deliberately not honoured, by the owner's choice) (`lib/analytics-ua.ts`). No IPs stored; town/country from Vercel headers.
  No cookie banner (owner's choice, relying on the PECR statistics exemption): the footer's "Privacy & Cookies Policy" link goes to /privacy/ (`app/(site)/privacy/`), which explains it (`components/PrivacyNotice.tsx`, with `AnalyticsOptOut`).
  Phase 2: `track()` in lib/track.ts sends extra events from public components ('media' from `SermonAudio`/`YouTubePlayer trackAs`,
  progress milestones 0/25/50/75/95 in props.pct; 'search' from SermonBrowser, debounced; 404s are pageviews with props.nf).
  Admin → Analytics has tabs (`?view=`: overview, pages, clicks, sermons, searches, missing; views.tsx, parts.tsx) and CSV
  downloads (`analytics/export/route.ts`, `?report=…`, "events" streams every row). New reports need their SQL function in
  supabase/analytics.sql; the owner re-runs it (the page shows the setup panel when a function is missing).
  Phase 3: every click carries props {sel, fx, fy} (element path + point within it; non-link clicks are kind "none", heatmaps only).
  Heatmaps tab frames the public page with `?sc-heatmap=1` (never counted) and postMessages the clicks to
  `components/HeatmapOverlay.tsx`, which draws them (accepts messages only from ADMIN_HOST or its own origin; frame-ancestors
  header in next.config.ts allows only self + admin). Goals & funnels (`lib/analytics-goals.ts`, saved in
  `private/settings/analytics-goals.json`) are matched in SQL by `analytics_matches`/`analytics_funnel`; the contact form sends a
  'form' event. The flow diagram (`FlowDiagram.tsx`, `analytics_flow`) is on Pages & journeys.
  Checks: the setup panel lists missing report functions (`missingReports`, REPORT_FUNCTIONS in lib/analytics.ts: add new
  functions there too); Overview shows the last recorded event and the last recording error (saved by /api/collect to
  `private/settings/analytics-status.json`). The live site is served at www.rossmdev.co.uk (the bare domain redirects there).
- Admin → Holding Slides (tool "holding-slides"): the live stream's holding slides with every revision, listed in
  `lib/holding-slides.ts`; images in `holding-slides/<slide>/<file>.png|.jpg` (not public, served by
  `app/admin/(panel)/holding-slides/file/[...path]/route.ts` behind requireTool). Made with `scripts/render-holding-slides.cjs`;
  add new revisions there and at the end of the slide's `revisions`.
  Videos (`HOLDING_VIDEOS`) live in `public/holding-videos/` (too big for the route; proxy.ts skips that folder), e.g. the
  15-minute "service will start shortly" verses video: NIV (Anglicised) verses in `content/holding-video-verses-v<N>.json`, made with
  `scripts/holding-video/` (see its README). Keep video files well under GitHub's 100 MB limit.
- Admin → Branding (tool "branding", `app/admin/(panel)/branding/`): logos, colours (keep in step with :root in globals.css),
  fonts, tagline, buttons, photos and the Free Church logos we use, with downloads.
- Use `revalidatePath("/literal-path")` (no `type`) to refresh a public page after an admin change;
  with a type it matches route files, and the `(site)` group means it won't match.

## Images

- Never use the AI-generated photo of a congregation seated in the auditorium (the old WordPress homepage
  image, `6A81AACC-…jpeg`, later `public/images/hero.jpg`). The owner has asked for it not to be used anywhere.
