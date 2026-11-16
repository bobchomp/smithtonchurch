import "server-only";
import oldPages from "@/content/old-sermon-pages.json";
import { BIBLE_BOOKS } from "./bible";
import { slugify } from "./content";
import type { PublicSermon } from "./sermon-types";

// The old WordPress site's sermon addresses (smithtonchurch.com/sermons/<slug>/, and its book,
// minister and series lists), sent to the same sermon or list on this site so links and search
// results keep working. content/old-sermon-pages.json lists each old sermon page as
// slug: [date, service ("am"/"pm"), title, preacher], taken from the old site in November 2026.

// Sermons removed because they were joined to another (e.g. the halves of a split livestream): old number → new.
export const MERGED_SERMONS: Record<number, number> = {
  10097: 10096, // Rediscover Christmas #2 - Timing, 21 December 2025 (the stream was split in two)
};

type OldPage = [date: string, service: string, title: string, preacher: string];
const OLD = oldPages as unknown as Record<string, OldPage>;

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/['’‘]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !["the", "and", "for", "part"].includes(w));

// Words shared by two titles, as a share of the old title's words.
function likeness(a: string, b: string): number {
  const wa = new Set(words(a));
  if (!wa.size) return 0;
  const wb = new Set(words(b));
  return [...wa].filter((w) => wb.has(w)).length / wa.size;
}

const archiveSearch = (text: string) => {
  const q = words(text).slice(0, 4).join(" ");
  return q ? `/sermons/?q=${encodeURIComponent(q)}` : "/sermons/";
};

// Where an old sermon page now lives, or undefined if the address wasn't an old sermon page.
export function oldSermonTarget(slug: string, sermons: PublicSermon[]): string | undefined {
  const old = Object.hasOwn(OLD, slug) ? OLD[slug] : undefined;
  if (!old) return undefined;
  const [date, service, title] = old;
  const sameDay = sermons.filter((s) => s.date === date);
  const candidates = sameDay.filter((s) => !service || !s.service || s.service === service);
  const pool = candidates.length ? candidates : sameDay;
  if (pool.length === 1) return pool[0].path;
  if (pool.length > 1) {
    const best = pool.map((s) => ({ s, score: likeness(title, s.title) })).sort((a, b) => b.score - a.score)[0];
    if (best.score > 0) return best.s.path;
  }
  // Not on this site yet (or no clear match): the sermon archive, searching for its title.
  return archiveSearch(title);
}

// The old site's lists: /sermons/book/<book>/, /sermons/minister/<name>/, /sermons/series/<series>/.
export function oldSermonListTarget(kind: string, slug: string, sermons: PublicSermon[]): string {
  if (kind === "book") {
    const book = BIBLE_BOOKS.find((b) => slugify(b) === slug) ?? BIBLE_BOOKS.find((b) => slugify(b).startsWith(slug) || slug.startsWith(slugify(b)));
    return book ? `/sermons/?book=${encodeURIComponent(book)}` : "/sermons/";
  }
  if (kind === "minister") {
    const preachers = [...new Set(sermons.map((s) => s.preacher).filter(Boolean))];
    const plain = (name: string) => slugify(name.replace(/^(rev(erend)?|dr|pastor|mr|mrs|ms)\.?\s+/i, ""));
    const preacher = preachers.find((p) => plain(p) === slug) ?? preachers.find((p) => plain(p).endsWith(slug) || slug.endsWith(plain(p)));
    return preacher ? `/sermons/?preacher=${encodeURIComponent(preacher)}` : archiveSearch(slug.replace(/-/g, " "));
  }
  if (kind === "series") return archiveSearch(slug.replace(/-/g, " "));
  return "/sermons/";
}
