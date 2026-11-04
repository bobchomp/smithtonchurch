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
