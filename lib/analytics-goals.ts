// Goals and funnels for Admin → Analytics (shared by the server and the admin forms).
// A goal is something a visit can do, such as visiting the Live Services page or sending a message;
// a funnel is several goals in order within one visit. They're matched in the database by
// analytics_matches() in supabase/analytics.sql, so the types here must match that.

export const GOAL_TYPES = [
  { key: "page", label: "Visited a page", match: "Page address, e.g. /live/", needsMatch: true },
  { key: "page-starts", label: "Visited any page in a section", match: "Address starts with, e.g. /sermons/", needsMatch: true },
  { key: "sermon-play", label: "Played a sermon", needsMatch: false },
  { key: "sermon-finish", label: "Finished a sermon", needsMatch: false },
  { key: "form", label: "Sent a message (contact form)", needsMatch: false },
  { key: "download", label: "Downloaded a file", match: "File name contains (optional), e.g. Bulletin", needsMatch: false },
  { key: "outbound", label: "Followed a link to another website", match: "Address contains (optional), e.g. churchsuite", needsMatch: false },
  { key: "click", label: "Clicked a link or button", match: "Link address or button text contains", needsMatch: true },
  { key: "search", label: "Searched the sermons", needsMatch: false },
] as const;

export type GoalType = (typeof GOAL_TYPES)[number]["key"];
export type GoalCondition = { type: GoalType; match?: string };
export type Goal = { id: string; name: string; condition: GoalCondition };
export type FunnelStep = { name: string; condition: GoalCondition };
export type Funnel = { id: string; name: string; steps: FunnelStep[] };
export type GoalsConfig = { goals: Goal[]; funnels: Funnel[] };

export const isGoalType = (v: unknown): v is GoalType => GOAL_TYPES.some((t) => t.key === v);

export function describeCondition(c: GoalCondition): string {
  const type = GOAL_TYPES.find((t) => t.key === c.type);
  if (!type) return "Unknown";
  return c.match ? `${type.label}: ${c.match}` : type.label;
}

// Suggestions offered when there are no goals yet (one click to add each).
export const SUGGESTED_GOALS: Omit<Goal, "id">[] = [
  { name: "Watched a live service", condition: { type: "page", match: "/live/" } },
  { name: "Played a sermon", condition: { type: "sermon-play" } },
  { name: "Finished a sermon", condition: { type: "sermon-finish" } },
  { name: "Sent a message", condition: { type: "form" } },
  { name: "Opened this week’s bulletin", condition: { type: "download", match: "bulletin" } },
  { name: "Went to give online", condition: { type: "page", match: "/giving/" } },
];

export const SUGGESTED_FUNNELS: Omit<Funnel, "id">[] = [
  {
    name: "Home page to a sermon",
    steps: [
      { name: "Home page", condition: { type: "page", match: "/" } },
      { name: "Sermons list", condition: { type: "page", match: "/sermons/" } },
      { name: "A sermon’s page", condition: { type: "page-starts", match: "/sermons/" } },
      { name: "Played it", condition: { type: "sermon-play" } },
    ],
  },
];
