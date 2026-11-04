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
| This week's bulletin | Upload it in the admin panel: **Dashboard → Weekly Bulletin** |
| Team members, elders, deacons | `content/team.yml` (photos go in `public/images/team/`) |
| What's On groups | `content/whats-on.yml` (images go in `public/images/whats-on/`) |
| Mission partners and prayer points | `content/missions.yml` (images go in `public/images/missions/`) |
| Conference rooms | `content/venue-rooms.yml` (images go in `public/images/venue/`) |
| Menu items | `content/navigation.yml` |
| Phone, email, address, social links, live stream | `content/site.yml` |
| Service times and welcome text | `app/(site)/page.tsx` |
| About Us, Giving and other page text | `app/(site)/<page-name>/page.tsx` |

The `content` files are YAML: keep the indentation exactly as it is, and start each new person or
item with `- name:` like the ones around it. If a change breaks the build, Vercel keeps the
previous version live and shows the error on the deployment, so the site never goes down.

### Uploading a file on GitHub

Open the folder (for example `public/docs/bulletins`), then click **Add file → Upload files**.
Keep file names lowercase with hyphens and no spaces, e.g. `20261108-Bulletin-web.pdf`.

## Contact form

The contact forms (home page and Conferencing Venue page) save every message in the admin panel
(**Dashboard → Messages**) and email it, through [Resend](https://resend.com), to the addresses
listed there under **Notification emails**. Emails come from `info@rossmackenzie.co.uk`, with the
sender's name shown as e.g. "Jane Smith (Website)"; replying to one replies to the person who sent
the message. If an email can't be sent, the message is still
saved and the admin panel says why.

To set up the emails:

1. Sign in at resend.com, open **Domains → Add domain**, enter `rossmackenzie.co.uk`, and add the
   DNS records it shows wherever that domain's DNS is managed. Wait until Resend shows it as
   **Verified**.
2. Open **API Keys → Create API key** with **Sending access** (it can be limited to that domain).
3. In Vercel, add the environment variable `RESEND_API_KEY` with the key, then redeploy.
4. In **Admin → Messages**, add the addresses to notify and press **Send a test email**.

To send from a different address later, set `CONTACT_FROM` in Vercel, e.g.
`Smithton Church <office@smithtonchurch.com>` (its domain must be verified in Resend).

Spam is kept out with a hidden field that only robots fill in and a check that the form wasn't
submitted instantly. Messages are only ever emailed to the addresses in the admin panel.

## Admin panel

The admin panel lives at **admin.rossmdev.co.uk** (or `/admin/` on a Vercel preview address)
and is protected by a PIN. It's a starting point; tools for managing the site will be added to it.

To set it up:

1. In Vercel, open the project's **Settings → Environment Variables** and add `ADMIN_PIN` with
   the PIN you want. Use at least 8 digits; a short PIN is easy to guess. Then redeploy.
2. In **Settings → Domains**, add `admin.rossmdev.co.uk` and add the DNS record Vercel shows
   at the domain registrar.

Signing in lasts 12 hours. Changing `ADMIN_PIN` signs everyone out.

### File storage (Supabase)

Files uploaded in the admin panel, such as the weekly bulletin, are stored in
[Supabase](https://supabase.com) Storage. To connect it:

1. Create a free project at supabase.com.
2. In the Supabase project, open **Project Settings → API Keys** and copy the **secret** key, and
   from **Project Settings → Data API** copy the **Project URL**.
3. In Vercel, add them as environment variables `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, then
   redeploy. (Installing the Supabase integration from Vercel's marketplace also works.)

A public storage bucket called `website` is created automatically on the first upload. Keep the
secret key private: it gives full access to the Supabase project.

Supabase pauses free projects after a week without activity. If that happens, uploads stop
working and the website shows the bulletin built into the site (`content/bulletin.yml`) until the
project is restored from the Supabase dashboard.

## Sermons

The Sermons page (`/sermons/`) is a searchable archive with a page and audio player for each
sermon. Sermons are added and edited in the admin panel (**Dashboard → Sermons**). Their details
are kept in Supabase; the audio files are kept in **Cloudflare R2**, which is very cheap for large
files and doesn't charge when people listen or download.

Until the old archive has been copied over, the header's **Sermons** button still goes to YouTube
(`content/navigation.yml`); point it at `/sermons/` when you're ready.

A sermon can have more than one book of the Bible. **Admin → Sermon Details** steps through the
sermons since the old media site stopped (the ones the import can't fill in), oldest first: the
video is on the left and the details on the right, and **Save and next** saves one and opens the
next. **Skip for now** leaves a sermon for later.

### Setting up Cloudflare R2 (for sermon audio)

1. In the Cloudflare dashboard open **R2 Object Storage** and create a bucket, e.g.
   `smithton-sermons`.
2. Give it a public address: in the bucket's **Settings → Custom Domains**, connect a domain such
   as `media.smithtonchurch.com` (the domain's DNS must be managed by Cloudflare). For testing,
   you can instead turn on the **r2.dev** public address on the same page.
3. Still in the bucket's **Settings**, add this **CORS policy** so the admin panel can upload to it:

   ```json
   [
     {
       "AllowedOrigins": ["https://admin.rossmdev.co.uk", "https://admin.smithtonchurch.com"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedHeaders": ["content-type", "content-disposition"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

4. Back on the R2 overview, choose **Manage API tokens → Create API token**, with
   **Object Read & Write** permission for just that bucket. Copy the access key ID and secret
   access key (the secret is only shown once).
5. In Vercel, add these environment variables, then redeploy:

   | Variable | Value |
   | --- | --- |
   | `R2_ACCOUNT_ID` | your Cloudflare account ID (shown on the R2 overview page) |
   | `R2_ACCESS_KEY_ID` | from step 4 |
   | `R2_SECRET_ACCESS_KEY` | from step 4 |
   | `R2_BUCKET` | the bucket name, e.g. `smithton-sermons` |
   | `R2_PUBLIC_URL` | the public address from step 2, e.g. `https://media.smithtonchurch.com` |

### Connecting YouTube (livestream videos on sermon pages)

Past livestreams from the church's YouTube channel are matched to sermons by date and service
(streams starting before 2pm count as the morning service), so each sermon page shows the video
with the audio underneath. The list of livestreams is refreshed once a day, or straight away with
**Check YouTube now** in **Admin → Sermons**, which also lists livestreams that don't have a
sermon yet. A sermon's video can be changed or switched off on its admin page. Streams with
"Church Night", "funeral" or "thanksgiving service" in the title are left out. When a sermon is
created from a stream, the preacher comes from the stream's description and the Bible book from
its title (when the title names one, e.g. "Psalm 124").

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a project (e.g.
   "Smithton Church website"), then open **APIs & Services → Library**, find
   **YouTube Data API v3** and click **Enable**.
2. Open **APIs & Services → Credentials → Create credentials → API key**. Then edit the key:
   under **API restrictions** choose **Restrict key** and tick only **YouTube Data API v3**.
3. In Vercel, add the environment variables `YOUTUBE_API_KEY` (the key) and `CRON_SECRET` (any long
   random text, e.g. from a password generator; it stops anyone else triggering the daily check).
   Then redeploy.
4. Set up the daily check at [cron-job.org](https://cron-job.org) (free): **Create cronjob** with
   - **URL:** `https://rossmdev.co.uk/api/cron/sync-livestreams/` (change to `smithtonchurch.com`
     at launch; keep the slash at the end)
   - **Schedule:** every day, e.g. at 06:00
   - under **Advanced → Headers**, add a header with key `Authorization` and value
     `Bearer ` followed by your `CRON_SECRET` (e.g. `Bearer abc123…`)

   Use **Test run** to check it: the response should look like `{"livestreams":123,...}`. A
   `401` means the header doesn't match `CRON_SECRET`.

The channel is taken from the YouTube link in `content/site.yml`. A full check uses about
1 unit for every 50 videos of YouTube's free allowance of 10,000 units a day.

### Importing the old sermon archive

`scripts/import-media-site.mjs` copies every sermon from the old site (smithtonchurchmedia.com):
the details (date, service, title, preacher, series and Bible book) into the sermon list, and each MP3 into R2. Each imported sermon keeps its number from
the old site, so `/?sermon_id=1632` there becomes `/sermons/1632-…` here. Run it on your own
computer, as the old site can't be reached from Vercel or Claude's environment:

1. Install [Node.js](https://nodejs.org) 22 or newer, then in this folder run `npm install`.
2. Copy `.env.import.example` to `.env.import` and fill in the Supabase and R2 values (the same
   as in Vercel). `.env.import` is never committed.
3. Check what it finds, without changing anything (saves `media-import-preview.json`):

   ```bash
   node --env-file=.env.import scripts/import-media-site.mjs --dry-run
   ```

4. Copy everything (about 1,500 sermons and 45–50 GB of audio, so it takes a few hours):

   ```bash
   node --env-file=.env.import scripts/import-media-site.mjs
   ```

It's safe to run again: sermons already copied are updated rather than duplicated, and audio
already copied is skipped, so an interrupted run carries on where it stopped.

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
