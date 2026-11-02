# Smithton Church website

The website for [Smithton Church, Inverness](https://smithtonchurch.com), built with
[Next.js](https://nextjs.org) and hosted on [Vercel](https://vercel.com). No WordPress and no
plugins to keep updated. Every page is pre-built, so the site is fast and has very little that can go wrong.

Most updates are a matter of editing a text file on GitHub. Open the file, click the pencil
icon, make the change, then click **Commit changes**. Vercel rebuilds the live site automatically
within a minute or two.

## Common updates

| To change… | Edit this file |
| --- | --- |
| This week's bulletin | Upload the PDF to `public/docs/bulletins/`, then update `content/bulletin.yml` |
| Team members, elders, deacons | `content/team.yml` (photos go in `public/images/team/`) |
| What's On groups | `content/whats-on.yml` (images go in `public/images/whats-on/`) |
| Mission partners and prayer points | `content/missions.yml` (images go in `public/images/missions/`) |
| Conference rooms | `content/venue-rooms.yml` (images go in `public/images/venue/`) |
| Menu items | `content/navigation.yml` |
| Phone, email, address, social links, live stream | `content/site.yml` |
| Service times and welcome text | `app/page.tsx` |
| About Us, Giving and other page text | `app/<page-name>/page.tsx` |

The `content` files are YAML: keep the indentation exactly as it is, and start each new person or
item with `- name:` like the ones around it. If a change breaks the build, Vercel keeps the
previous version live and shows the error on the deployment, so the site never goes down.

### Uploading a file on GitHub

Open the folder (for example `public/docs/bulletins`), then click **Add file → Upload files**.
Keep file names lowercase with hyphens and no spaces, e.g. `20261108-Bulletin-web.pdf`.

## Contact form

The contact form uses [Formspree](https://formspree.io) (free for up to 50 messages a month):

1. Sign up at formspree.io with the church office email address and create a new form.
2. Copy the form's ID (the part after `/f/` in its URL, e.g. `xyzabcd`).
3. Paste it into `formspree_id` in `content/site.yml`.

Until that's done, the site shows the office phone number and email address where the form would be.

## Admin panel

The admin panel lives at **admin.smithtonchurch.com** (or `/admin/` on a Vercel preview address)
and is protected by a PIN. It's a starting point; tools for managing the site will be added to it.

To set it up:

1. In Vercel, open the project's **Settings → Environment Variables** and add `ADMIN_PIN` with
   the PIN you want. Use at least 8 digits; a short PIN is easy to guess. Then redeploy.
2. In **Settings → Domains**, add `admin.smithtonchurch.com` and add the DNS record Vercel shows
   at the domain registrar.

Signing in lasts 12 hours. Changing `ADMIN_PIN` signs everyone out.

## Going live on Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub, click **Add New → Project**, and import
   the `smithtonchurch` repository. Vercel detects Next.js; leave the settings as they are and click
   **Deploy**. The site appears at a `….vercel.app` address so it can be checked first.
2. When everyone is happy, go to the project's **Settings → Domains**, add `smithtonchurch.com`
   (and `www.smithtonchurch.com`), and update the DNS records at the domain registrar as Vercel
   shows. Only change the records for the website. Leave any `MX` (email) records alone so church
   email keeps working.

Vercel's free Hobby plan is for non-commercial use. If in doubt, check
[Vercel's fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines) or ask Vercel.

The page addresses match the old WordPress site (`/about-us/`, `/team/`, `/community/` and so on),
so existing links and Google results keep working.

## Working on the code (optional)

You need [Node.js](https://nodejs.org) 20 or newer. In this folder:

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000. Run `npm run build` to check everything builds before pushing.
