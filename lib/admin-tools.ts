// The admin tools an owner can give or take away from each admin (Admin → Users). Owners always
// have every tool. Shared by the server and the browser (no secrets here).

export const ADMIN_TOOLS = [
  { key: "messages", label: "Messages", hint: "Read and delete contact form messages, and choose who’s emailed" },
  { key: "bulletin", label: "Weekly Bulletin", hint: "Upload and delete bulletins" },
  { key: "sermons", label: "Sermons", hint: "Add, edit and delete sermons, and check YouTube" },
  { key: "sermon-details", label: "Sermon Details", hint: "Fill in the details of recent sermons" },
  { key: "newsletter", label: "Marsali’s Newsletter", hint: "Upload and delete newsletters" },
  { key: "live-notices", label: "Live Notices", hint: "Messages and images on the Watch Live page" },
  { key: "pages-to-review", label: "Pages to Review", hint: "See draft pages before they go live" },
  { key: "analytics", label: "Analytics", hint: "See how people find and use the website" },
  { key: "holding-slides", label: "Holding Slides", hint: "See and download the live stream’s holding slides" },
  { key: "branding", label: "Branding", hint: "The church’s logos, colours and fonts" },
  { key: "activity-log", label: "Activity Log", hint: "See everything that’s been done in the admin panel and by the website" },
] as const;

export type AdminTool = (typeof ADMIN_TOOLS)[number]["key"];
export const ALL_TOOLS: AdminTool[] = ADMIN_TOOLS.map((t) => t.key);
// Tools an admin only gets when an owner ticks them (not included in "all tools" by default).
export const OFF_BY_DEFAULT: AdminTool[] = ["activity-log"];
export const DEFAULT_TOOLS: AdminTool[] = ALL_TOOLS.filter((t) => !OFF_BY_DEFAULT.includes(t));
export const TOOLS_KEY = "smithton_tools"; // in each Supabase user's app_metadata

export function isAdminTool(value: unknown): value is AdminTool {
  return typeof value === "string" && (ALL_TOOLS as string[]).includes(value);
}

// An admin's tools from their app_metadata. Admins set up before tools could be chosen have them
// all, except the ones that are off by default.
export function toolsOf(appMetadata: Record<string, unknown> | undefined): AdminTool[] {
  const saved = appMetadata?.[TOOLS_KEY];
  return Array.isArray(saved) ? saved.filter(isAdminTool) : DEFAULT_TOOLS;
}
