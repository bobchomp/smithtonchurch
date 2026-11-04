# Notes for Claude

- Next.js (App Router) site deployed on Vercel from `main`. Editable content lives in `content/*.yml`.
- Run `npm run build` before committing; it must pass.
- The owner wants changes to go live automatically: after committing and pushing your working
  branch, merge it into `main` and push `main` (fast-forward where possible). No pull request needed.

## Layout

- `app/(site)/` holds the public pages (header/footer in its layout). They are statically pre-rendered.
- `app/admin/` is the admin panel. `proxy.ts` keeps it on admin.rossmdev.co.uk and redirects
  `/admin` on the main domain there. Domains are set in `lib/domains.ts` (site is on rossmdev.co.uk during development). While SITE_HOST isn't smithtonchurch.com, the whole site is noindex (meta tag + X-Robots-Tag header). Addresses keep the `/admin/` prefix on the subdomain too.
- Admin auth: a single `ADMIN_PIN` env var (`lib/admin-auth.ts`). Pages inside `app/admin/(panel)/`
  are guarded by its layout, but every server action and route handler must call `requireAdmin()` itself.
- Add each new admin tool as a card on `app/admin/(panel)/page.tsx`.
- Uploaded PDFs (weekly bulletin, Marsali's newsletter) share one system: `lib/document-types.ts` (kinds, dated by
  day or month), `lib/documents.ts` (storage), `app/admin/(panel)/_documents/` (admin) and
  `components/Document*.tsx` (public). Add a new kind to DOCUMENT_TYPES rather than copying code.
- Sermons: the list is one JSON file in Supabase Storage (`website/sermons/index.json`, `lib/sermons.ts`);
  audio is in Cloudflare R2 (`lib/r2.ts`, S3 API, browser uploads via presigned PUT). Imported sermons keep
  the old media site's `sermon_id` as their id (< 10000); admin-added ones start at 10001.
  `scripts/import-media-site.mjs` copies the old archive and is run by the owner locally (the old site is
  http-only, which this environment can't reach). The header still links Sermons to YouTube until the import.
- YouTube livestreams: `lib/youtube.ts` (Data API, YOUTUBE_API_KEY) fetches finished livestreams; `lib/livestreams.ts`
  saves them to `website/livestreams/index.json` (daily Vercel cron `/api/cron/sync-livestreams/` with CRON_SECRET, or
  "Check YouTube now"). `lib/livestream-match.ts` matches them to sermons by UK date and service (before 2pm = am);
  a sermon's `video` field overrides ("none" or a YouTube ID). Pages read the saved list, never YouTube directly.
- Storage and future data live in Supabase (`lib/supabase.ts`, secret key, server only). Files go in the
  public `website` bucket under a folder per feature (e.g. `bulletins/`). Browsers upload straight to
  Supabase with a signed upload URL from a server action, which avoids Vercel's request size limit.
- Use `revalidatePath("/literal-path")` (no `type`) to refresh a public page after an admin change;
  with a type it matches route files, and the `(site)` group means it won't match.

## Images

- Never use the AI-generated photo of a congregation seated in the auditorium (the old WordPress homepage
  image, `6A81AACC-…jpeg`, later `public/images/hero.jpg`). The owner has asked for it not to be used anywhere.
