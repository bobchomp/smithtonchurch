// The books of the Bible, in order, for filtering sermons by book.
export const BIBLE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Songs", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
  "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];

const ALIASES: Record<string, string> = {
  psalm: "Psalms",
  "song of solomon": "Song of Songs",
  revelations: "Revelation",
};

// "John 1:1-18" -> "John"; "1 Cor 13" isn't recognised (only full names), returning undefined.
export function bookFromPassage(passage: string | undefined): string | undefined {
  if (!passage) return undefined;
  const text = passage.trim().toLowerCase().replace(/\s+/g, " ");
  const alias = Object.keys(ALIASES).find((a) => text.startsWith(a));
  if (alias) return ALIASES[alias];
  // Longest names first, so "1 John" isn't mistaken for "John".
  return [...BIBLE_BOOKS].sort((a, b) => b.length - a.length).find((b) => text.startsWith(b.toLowerCase()));
}

// Finds a Bible reference in a title, e.g. "‘Felix before Paul’ Acts 24:1-27" -> "Acts 24:1-27",
// "Ruth2" -> "Ruth 2", "Revelation 3: 7-13" -> "Revelation 3:7-13". Returns undefined if there isn't one.
export function passageFromTitle(title: string): string | undefined {
  const names = [...BIBLE_BOOKS, ...Object.keys(ALIASES).map((a) => a.replace(/\b\w/g, (c) => c.toUpperCase()))]
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/ /g, "\\s*"));
  const pattern = new RegExp(
    `(?<![A-Za-z0-9])(${names.join("|")})\\s*(\\d{1,3})(?:\\s*[:.;]\\s*(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?)?(?![\\d])`,
    "i",
  );
  const match = title.match(pattern);
  if (!match) return undefined;
  const book = bookFromPassage(match[1].replace(/\s+/g, " "));
  if (!book) return undefined;
  const [, , chapter, from, to] = match;
  return `${book === "Psalms" ? "Psalm" : book} ${chapter}${from ? `:${from}${to ? `-${to}` : ""}` : ""}`;
}

// The book of the Bible named in a title, e.g. "‘Saved from the Jaws of Death’ Psalm 124" -> "Psalms".
export function bookFromTitle(title: string): string | undefined {
  return bookFromPassage(passageFromTitle(title));
}

// Whether a value is one of the 66 book names above.
export function isBibleBook(value: string | undefined): value is string {
  return Boolean(value && BIBLE_BOOKS.includes(value));
}

// A list of books tidied up: only real books, no repeats, in Bible order.
export function sortBooks(books: Iterable<string | undefined>): string[] {
  const chosen = new Set([...books].filter(isBibleBook));
  return BIBLE_BOOKS.filter((b) => chosen.has(b));
}
