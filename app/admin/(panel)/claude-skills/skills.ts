// The Claude Code skills tried on this project, and the commands worth using here (Admin → Claude Skills,
// owners only). Edit this list when skills are added or dropped.

export type SkillCommand = { command: string; use: string };
export type SkillGroup = { heading?: string; commands: SkillCommand[] };
export type SkillPack = {
  name: string;
  from: string;
  about: string;
  install: string[];
  groups: SkillGroup[];
  skip?: string;
};

export const SKILL_PACKS: SkillPack[] = [
  {
    name: "Humanizer",
    from: "github.com/blader/humanizer",
    about: "Makes wording read naturally, removing the stiff, over-polished tone AI-written text often has.",
    install: ["/plugin marketplace add blader/humanizer", "/plugin install humanizer@humanizer"],
    groups: [
      {
        commands: [
          {
            command: "/humanizer:humanizer",
            use: "Smooth the wording on a page: the home page welcome, About Us, the privacy policy, or messages in the admin panel.",
          },
        ],
      },
    ],
  },
  {
    name: "Marketing skills",
    from: "github.com/coreyhaines31/marketingskills",
    about: "Advice and writing for getting the church found online, and getting visitors to take the next step.",
    install: ["npx skills add coreyhaines31/marketingskills"],
    groups: [
      {
        heading: "Being found",
        commands: [
          { command: "/seo-audit", use: "A full check of how Google sees the site: titles, descriptions, the sitemap, redirects from the old site. Best done before the move to smithtonchurch.com." },
          { command: "/schema", use: "Check and extend the “Church” details search engines read: service times, address, events and sermons." },
          { command: "/ai-seo", use: "Help the church come up when people ask ChatGPT or Google’s AI about churches near Inverness." },
          { command: "/site-architecture", use: "Review the menu, page addresses and how pages link to each other." },
          { command: "/programmatic-seo", use: "Only if you want pages made from data, such as one per Bible book or preacher in the sermon archive." },
        ],
      },
      {
        heading: "Wording",
        commands: [
          { command: "/copywriting", use: "Rewrite a page from scratch, e.g. the home page or a “Visit us” page for first-time visitors." },
          { command: "/copy-editing", use: "Tighten and proofread existing pages without rewriting them." },
        ],
      },
      {
        heading: "Getting people to act",
        commands: [
          { command: "/cro", use: "Ideas to get more people using the contact form, finding Live Services or planning a visit." },
          { command: "/analytics", use: "Review what Admin → Analytics records, and whether the goals and funnels make sense." },
          { command: "/ab-testing", use: "Only if you want to try two versions of a page to see which works better." },
        ],
      },
      {
        heading: "Outreach",
        commands: [
          { command: "/product-marketing", use: "Write down who the church wants to reach and how it describes itself. The other marketing skills use it, so do this first." },
          { command: "/content-strategy", use: "Plan what to publish: sermon series pages, news, community updates." },
          { command: "/social", use: "Facebook and Instagram post ideas and a posting calendar." },
          { command: "/emails", use: "Welcome emails or newsletters, if you start collecting email addresses." },
          { command: "/events", use: "Promote events such as the communion weekend, Hope Explored or the conference venue." },
          { command: "/image", use: "Social graphics and share images." },
        ],
      },
    ],
    skip: "Not useful here: the ones for selling software, such as ads, pricing, cold-email, paywalls, sales-enablement and sms.",
  },
  {
    name: "Matt Pocock’s skills",
    from: "Claude’s official plugin directory (mattpocock-skills)",
    about: "Ways of working on the website’s code: planning, finding bugs, reviewing and testing.",
    install: ["/plugin marketplace add anthropics/claude-plugins-official", "/plugin install mattpocock-skills@claude-plugins-official"],
    groups: [
      {
        commands: [
          { command: "/mattpocock-skills:grilling", use: "Claude questions you about a plan before anything is built, e.g. the launch on smithtonchurch.com or a new feature." },
          { command: "/mattpocock-skills:diagnosing-bugs", use: "A careful step-by-step hunt when something is broken, like a livestream not turning into a sermon." },
          { command: "/mattpocock-skills:code-review", use: "Review everything changed since a point in time, e.g. “since last week”." },
          { command: "/mattpocock-skills:tdd", use: "Build new features test-first, and add the automatic tests the site doesn’t have yet." },
          { command: "/mattpocock-skills:wizard", use: "A step-by-step checklist for jobs only you can do in other dashboards: the domain switch, Cloudflare, Vercel or Supabase settings." },
          { command: "/mattpocock-skills:prototype", use: "A quick throwaway mock-up to try an idea, e.g. a new home page layout, before building it properly." },
          { command: "/mattpocock-skills:research", use: "Look a question up in reliable sources and save the findings, e.g. UK charity website rules." },
          { command: "/mattpocock-skills:codebase-design", use: "Reorganise parts of the code so they’re easier to change later." },
          { command: "/mattpocock-skills:writing-for-agents", use: "Tidy up the notes Claude works from (CLAUDE.md)." },
        ],
      },
    ],
    skip: "Not useful here: pr (changes go live without pull requests) and domain-modeling (for bigger software projects).",
  },
];
