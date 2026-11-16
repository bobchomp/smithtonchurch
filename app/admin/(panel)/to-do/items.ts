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
            detail:
              "Check titles, descriptions, the sitemap, redirects from old WordPress addresses, and switching the site from hidden to visible on Google. Report back before changing anything.",
          },
          {
            title: "Launch plan and checklist",
            detail:
              "Walk through the domain move, then a step-by-step list of the parts only the owner can do. The domain is used in the website’s settings, Vercel domains, Supabase sign-in links, Resend, the cron-job.org address, and the flipbook’s website list and webhook address. Holding slide links copied before the move will stop working.",
          },
        ],
      },
      {
        heading: "Making the site sturdier",
        items: [
          {
            title: "Email alerts when something fails",
            detail: "YouTube checks, contact form emails not sending, or the flipbook not making viewer links.",
          },
          {
            title: "Automatic tests saved in the project",
            detail: "Sign-in, the contact form, sermon pages, bulletins and the flipbook, so breakages are caught before going live.",
          },
          {
            title: "Accessibility and speed check",
            detail: "Screen readers, keyboard use, colour contrast and page load times.",
          },
        ],
      },
      {
        heading: "Tidy-ups",
        items: [
          {
            title: "Service times in one place",
            detail: "“10:30am and 5:30pm” is written in about six places; one setting would update them all.",
          },
          {
            title: "Remove test visits from Analytics",
            detail: "A button in the admin panel instead of running SQL.",
          },
          {
            title: "Activity log clean-up",
            detail: "Automatically delete entries after a set time, e.g. a year. At the moment they’re kept for ever.",
          },
          {
            title: "Keep the Claude skills between sessions",
            detail: "Add their install commands to the cloud environment’s setup script (the owner approves the script first).",
          },
          {
            title: "Claude Skills page: note about the suggestion box",
            detail: "The Claude app’s suggestion box may only show the Anthropic copy of Humanizer.",
          },
        ],
      },
      {
        heading: "Optional, only if wanted",
        items: [
          {
            title: "Centre the logo on smaller screens too",
            detail: "Between the screen edge and the Menu button.",
          },
          {
            title: "Missions, Cheptebo: missing word",
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
            title: "Flipbook app: fix its schema check",
            detail:
              "The flipbook dashboard’s check fails with SQLITE_AUTH, because D1 doesn’t allow pragma_table_info. It would have warned about the missing page_url column.",
          },
          {
            title: "Auditorium capacity",
            detail: "The Conferencing Venue page says “around 300”. Give Claude the exact number if you find it.",
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
            detail: "Left from the Humanizer review, in two friendly sentences. Suggestion: leave them.",
          },
        ],
      },
    ],
  },
];
