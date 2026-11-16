// The website's to-do list (Admin → To-do list, owners only).
// When an item is finished, set "done" to the date (YYYY-MM-DD): the page strikes it through but keeps it.

export type ToDo = { title: string; detail?: string; done?: string };
export type ToDoGroup = { heading: string; note?: string; sections: { heading?: string; items: ToDo[] }[] };

export const TO_DO: ToDoGroup[] = [
  {
    heading: "For Claude to do",
    sections: [
      {
        heading: "Before the launch on smithtonchurch.com",
        items: [
          {
            title: "SEO audit",
            done: "2026-11-16",
            detail:
              "Check titles, descriptions, the sitemap, redirects from old WordPress addresses, and switching the site from hidden to visible on Google. Report back before changing anything.",
          },
          {
            title: "SEO fixes from the audit",
            done: "2026-11-16",
            detail:
              "Redirects for the old site's 642 sermon pages and its book, minister and series lists (to the same sermon, or the archive until the media import), and the two old team pages; quote marks removed from sermon titles; bulletin and newsletter viewer pages kept out of Google; real page links in the sermon archive; two page descriptions fixed.",
          },
          {
            title: "Launch plan and checklist",
            detail:
              "Walk through the domain move, then a step-by-step list of the parts only the owner can do. smithtonchurch.com (without www) must be the main domain, with www redirecting to it, and pages must stop saying noindex. The domain is used in the website’s settings, Vercel domains, Supabase sign-in links, Resend, the cron-job.org address, and the flipbook’s website list and webhook address. Holding slide links copied before the move will stop working.",
          },
        ],
      },
      {
        heading: "Making the site sturdier",
        items: [
          {
            title: "Email alerts when something fails",
            done: "2026-11-16",
            detail: "YouTube checks, contact form emails not sending, or the flipbook not making viewer links. Decided: not needed for now.",
          },
          {
            title: "Automatic tests saved in the project",
            done: "2026-11-16",
            detail: "Sign-in, the contact form, sermon pages, bulletins and the flipbook, so breakages are caught before going live. Decided: not needed for now.",
          },
          {
            title: "Accessibility and speed check",
            done: "2026-11-16",
            detail: "Screen readers, keyboard use, colour contrast and page load times. Decided: not needed for now (speed was already checked in the SEO audit: about 1 second on a phone).",
          },
        ],
      },
      {
        heading: "Tidy-ups",
        items: [
          {
            title: "Service times in one place",
            done: "2026-11-16",
            detail: "“10:30am and 5:30pm” was written in about six places. Now set once, as service_times in content/site.yml. (The holding slides have the times drawn into the pictures.)",
          },
          {
            title: "Remove test visits from Analytics",
            done: "2026-11-16",
            detail: "Owners have a “Remove” button on each visit in Analytics → Pages & journeys → Individual visits (needs the updated analytics_visits database function).",
          },
          {
            title: "Activity log clean-up",
            done: "2026-11-16",
            detail: "Automatically delete entries after a set time, e.g. a year. Decided: keep everything for now, and revisit if it becomes a problem.",
          },
          {
            title: "Keep the Claude skills between sessions",
            done: "2026-11-16",
            detail: "Add their install commands to the cloud environment’s setup script (the owner approves the script first).",
          },
          {
            title: "Claude Skills page: note about the suggestion box",
            done: "2026-11-16",
            detail: "The Claude app’s suggestion box may only show the Anthropic copy of Humanizer.",
          },
        ],
      },
      {
        heading: "Optional, only if wanted",
        items: [
          {
            title: "Missions, Cheptebo: missing word",
            done: "2026-11-16",
            detail: "The description ends “a new residential”. Left alone, as the Missions page isn’t to be changed.",
          },
        ],
      },
    ],
  },
  {
    heading: "For the owner to do",
    sections: [
      {
        items: [
          {
            title: "Cloudflare R2 and the sermon import",
            detail:
              "Set up R2, add its keys in Vercel, then run the import script locally. Until then, sermons before 8 November 2026 have no audio.",
          },
          {
            title: "Set up Google Search Console and Bing Webmaster Tools",
            detail:
              "Before launch: add smithtonchurch.com as a Domain property to see which old pages get visitors. After launch: submit the sitemap and watch for pages not found. Bing can import from Search Console.",
          },
          {
            title: "Check the Google Business Profile",
            detail:
              "Name, address (Murray Road, Smithton, Inverness IV2 7YU), phone (01463 793191) and service times match the website; recent photos; the website link points to smithtonchurch.com after launch.",
          },
          {
            title: "Duplicate sermon: “Rediscover Christmas #2 - Timing”",
            done: "2026-11-16",
            detail:
              "The livestream was split in two. Sermons can now show both parts: in Admin → Sermons, open 10096 and set Video to “Automatic” (it finds both parts), save, then delete 10097 (its address forwards to 10096). Separately, “God's Words - Grow God's Kingdom” is used for two different Sundays; part numbers would tell them apart.",
          },
          {
            title: "Flipbook app: fix its schema check",
            detail:
              "The flipbook dashboard’s check fails with SQLITE_AUTH, because D1 doesn’t allow pragma_table_info. It would have warned about the missing page_url column.",
          },
        ],
      },
    ],
  },
  {
    heading: "Waiting for a decision",
    sections: [
      {
        items: [
          {
            title: "About Us: two dashes",
            done: "2026-11-16",
            detail: "Left from the Humanizer review, in two friendly sentences. Decided: rewritten without the dashes.",
          },
        ],
      },
    ],
  },
];
