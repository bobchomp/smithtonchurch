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
- Storage and future data live in Supabase (`lib/supabase.ts`, secret key, server only). Files go in the
  public `website` bucket under a folder per feature (e.g. `bulletins/`). Browsers upload straight to
  Supabase with a signed upload URL from a server action, which avoids Vercel's request size limit.
- Use `revalidatePath("/literal-path")` (no `type`) to refresh a public page after an admin change;
  with a type it matches route files, and the `(site)` group means it won't match.
