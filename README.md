# Smithton Church website

The website for [Smithton Church, Inverness](https://smithtonchurch.com). It's a simple static site
built with [Jekyll](https://jekyllrb.com) and hosted free on GitHub Pages: no WordPress, no plugins,
no hosting bills.

Most updates are a matter of editing a text file on GitHub. Open the file, click the pencil
icon, make the change, then click **Commit changes**. The live site updates a minute or two later.

## Common updates

| To change… | Edit this file |
| --- | --- |
| This week's bulletin | Upload the PDF to `assets/docs/bulletins/`, then update `_data/bulletin.yml` |
| Team members, elders, deacons | `_data/team.yml` (photos go in `assets/images/team/`) |
| What's On groups | `_data/whats_on.yml` (images go in `assets/images/whats-on/`) |
| Mission partners and prayer points | `_data/missions.yml` (images go in `assets/images/missions/`) |
| Conference rooms | `_data/venue_rooms.yml` (images go in `assets/images/venue/`) |
| Menu items | `_data/navigation.yml` |
| Phone, email, address, social links, live stream | `_config.yml` |
| Service times and welcome text | `index.html` |
| About Us, Giving and other page text | the matching `.html` file in the top folder |

The `_data` files are YAML: keep the indentation exactly as it is, and start each new person or
item with `- name:` like the ones around it.

### Uploading a file on GitHub

Open the folder (for example `assets/docs/bulletins`), then click **Add file → Upload files**.
Keep file names lowercase with hyphens and no spaces, e.g. `20261108-Bulletin-web.pdf`.

## Contact form

GitHub Pages can't send email by itself, so the contact form uses [Formspree](https://formspree.io)
(free for up to 50 messages a month):

1. Sign up at formspree.io with the church office email address and create a new form.
2. Copy the form's ID (the part after `/f/` in its URL, e.g. `xyzabcd`).
3. Paste it into `formspree_id` in `_config.yml`.

Until that's done, the site shows the office phone number and email address where the form would be.

## Going live

1. **Turn on GitHub Pages:** in this repository go to **Settings → Pages**, set *Source* to
   **Deploy from a branch**, choose the `main` branch and the `/ (root)` folder, and save.
   The site appears at `https://bobchomp.github.io/smithtonchurch/` so it can be checked first.
2. **Point the domain at it** when everyone is happy. In **Settings → Pages → Custom domain**
   enter `smithtonchurch.com`, then at the domain registrar replace the website records with
   GitHub's (see [GitHub's guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain)).
   Only change the `A`/`AAAA`/`CNAME` records for the website. Leave any `MX` (email) records alone
   so church email keeps working.
3. Change `baseurl` in `_config.yml` to `""` once the custom domain is working.
4. Tick **Enforce HTTPS** in Settings → Pages.

The page addresses match the old WordPress site (`/about-us/`, `/team/`, `/community/` and so on),
so existing links and Google results keep working.

## Previewing changes on your own computer (optional)

You need Ruby installed. Then, in this folder:

```bash
bundle install
```

```bash
bundle exec jekyll serve --baseurl ""
```

Then open http://localhost:4000.
