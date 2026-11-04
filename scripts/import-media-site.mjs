#!/usr/bin/env node
// Copies the sermon archive from the old media website (smithtonchurchmedia.com) into this site:
// the details of every sermon (date, service, title, preacher and Bible book) go into the
// sermon list in Supabase, and each MP3 is copied to
// Cloudflare R2. Run it on your own computer (see README.md, "Importing the old sermon archive").
//
//   node --env-file=.env.import scripts/import-media-site.mjs --dry-run      # read only, save a preview
//   node --env-file=.env.import scripts/import-media-site.mjs --no-audio     # copy the details only
//   node --env-file=.env.import scripts/import-media-site.mjs                # details and audio
//
// Options: --dry-run, --no-audio, --pages=N (only the first N list pages), --force-audio (re-copy
// audio already copied). Safe to run again: sermons already copied are updated, not duplicated.

import { writeFile } from "node:fs/promises";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const SOURCE = (process.env.MEDIA_SITE_URL || "http://smithtonchurchmedia.com").replace(/\/+$/, "");
const INDEX_PATH = "sermons/index.json";
const BUCKET = "website";

const args = new Set(process.argv.slice(2).filter((a) => !a.includes("=")));
const option = (name) => process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const DRY_RUN = args.has("--dry-run");
const NO_AUDIO = args.has("--no-audio") || DRY_RUN;
const FORCE_AUDIO = args.has("--force-audio");
const MAX_PAGES = Number(option("pages")) || Infinity;

const BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Songs", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
  "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];
const BOOK_ALIASES = { psalm: "Psalms", "song of solomon": "Song of Songs", revelations: "Revelation" };

// A sermon's books, whether saved as a list (books) or the older single book.
function booksOf(sermon) {
  return sermon.books?.length ? sermon.books : sermon.book ? [sermon.book] : [];
}

function bookFromPassage(passage) {
  if (!passage) return undefined;
  const text = passage.trim().toLowerCase().replace(/\s+/g, " ");
  const alias = Object.keys(BOOK_ALIASES).find((a) => text.startsWith(a));
  if (alias) return BOOK_ALIASES[alias];
  return [...BOOKS].sort((a, b) => b.length - a.length).find((b) => text.startsWith(b.toLowerCase()));
}

// Finds a Bible reference in a title (same as passageFromTitle in lib/bible.ts).
function passageFromTitle(title) {
  const names = [...BOOKS, "Psalm", "Song of Solomon", "Revelations"].sort((a, b) => b.length - a.length).map((n) => n.replace(/ /g, "\\s*"));
  const match = title.match(new RegExp(`(?<![A-Za-z0-9])(${names.join("|")})\\s*(\\d{1,3})(?:\\s*[:.;]\\s*(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?)?(?![\\d])`, "i"));
  const book = match && bookFromPassage(match[1].replace(/\s+/g, " "));
  if (!book) return undefined;
  const [, , chapter, from, to] = match;
  return `${book === "Psalms" ? "Psalm" : book} ${chapter}${from ? `:${from}${to ? `-${to}` : ""}` : ""}`;
}

// ---------- Reading the old site ----------

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#039": "'" };
function decode(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
      e[0] === "#" ? String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e] ?? m),
    )
    .replace(/\s+/g, " ")
    .trim();
}

async function getText(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Smithton Church archive import" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      if (attempt >= 3) throw new Error(`Couldn’t load ${url}: ${error.message}`);
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
function parseDate(text) {
  const m = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  const month = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1;
  if (!m || month < 0) return undefined;
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

// One page of the sermon list (15 sermons): date, service, title, preacher and MP3.
export function parseListPage(html) {
  const sermons = [];
  const blocks = html.split(/<div class="sermon-title">/).slice(1);
  // The date line comes just before each title, so look back into the previous chunk for it.
  const chunks = html.split(/<div class="sermon-title">/);
  blocks.forEach((block, i) => {
    const before = chunks[i];
    const dateLines = [...before.matchAll(/<div class="preacher">([\s\S]*?)<\/div>/g)];
    const dateLine = dateLines.length ? dateLines[dateLines.length - 1][1] : "";
    // Only look inside the title itself, so a link further down the page can't be picked up.
    const titleDiv = block.slice(0, block.indexOf("</div>"));
    const titleMatch = titleDiv.match(/sermon_id=(\d+)[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) return;
    const speakerLine = block.match(/<div class="preacher">\s*Speaker:([\s\S]*?)<\/div>/)?.[1] ?? "";
    const preacher = decode(speakerLine.match(/preacher=\d+[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "");
    const fileName = block.match(/[?&](?:amp;)?(?:download|show)&(?:amp;)?file_name=([^"&]+)/)?.[1];
    const serviceText = decode(dateLine.match(/service=\d+[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "").toLowerCase();
    sermons.push({
      legacyId: Number(titleMatch[1]),
      title: decode(titleMatch[2]),
      date: parseDate(decode(dateLine)),
      service: serviceText === "am" || serviceText === "pm" ? serviceText : "",
      preacher,
      fileName: fileName ? decodeURIComponent(fileName.replace(/\+/g, " ")) : undefined,
    });
  });
  const hasNext = /pagenum=\d+[^>]*>\s*Next page/i.test(html);
  return { sermons, hasNext };
}

// ---------- Destinations ----------

function supabase() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.import");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(BUCKET);
}

function r2() {
  const env = (name) => process.env[name]?.trim();
  const endpoint = env("R2_ENDPOINT") || (env("R2_ACCOUNT_ID") && `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`);
  if (!endpoint || !env("R2_ACCESS_KEY_ID") || !env("R2_SECRET_ACCESS_KEY") || !env("R2_BUCKET")) {
    throw new Error("Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET in .env.import");
  }
  return {
    bucket: env("R2_BUCKET"),
    client: new S3Client({
      region: "auto",
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") },
    }),
  };
}

async function loadIndex(store) {
  const { data, error } = await store.download(INDEX_PATH, { cacheNonce: String(Date.now()) });
  if (error) return [];
  return JSON.parse(await data.text());
}

async function saveIndex(store, sermons) {
  const sorted = [...sermons].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const { error } = await store.upload(INDEX_PATH, JSON.stringify(sorted), {
    upsert: true,
    contentType: "application/json",
    cacheControl: "0",
  });
  if (error) throw new Error(`Couldn’t save the sermon list: ${error.message}`);
}

function slug(text) {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "sermon";
}

function contentDisposition(fileName) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "") || "sermon.mp3";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

async function audioDuration(buffer) {
  try {
    const { parseBuffer } = await import("music-metadata");
    const { format } = await parseBuffer(buffer, { mimeType: "audio/mpeg" }, { duration: true });
    return format.duration ? Math.round(format.duration) : undefined;
  } catch {
    return undefined;
  }
}

// ---------- Main ----------

async function main() {
  console.log(`Reading the sermon list from ${SOURCE}${DRY_RUN ? " (dry run: nothing will be changed)" : ""}…`);
  const found = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { sermons, hasNext } = parseListPage(await getText(`${SOURCE}/?pagenum=${page}`));
    found.push(...sermons);
    process.stdout.write(`\r  page ${page}: ${found.length} sermons so far`);
    if (!hasNext || sermons.length === 0) break;
  }
  console.log("");

  // The old site's sermon pages don't show the Bible passage, but its "Book" filter lists the
  // sermons for each book of the Bible, so go through those to give every sermon its books (a
  // sermon listed under several books gets them all).
  console.log("Reading the sermon list for each book of the Bible…");
  const bookOf = new Map();
  for (const [i, book] of BOOKS.entries()) {
    for (let page = 1; page <= 200; page++) {
      const { sermons, hasNext } = parseListPage(await getText(`${SOURCE}/?book=${encodeURIComponent(book)}&pagenum=${page}`));
      for (const s of sermons) {
        const books = bookOf.get(s.legacyId) ?? [];
        if (!books.includes(book)) bookOf.set(s.legacyId, [...books, book]);
      }
      if (!hasNext || sermons.length === 0) break;
    }
    process.stdout.write(`\r  ${i + 1} of ${BOOKS.length} books`);
  }
  let withBook = 0;
  for (const sermon of found) {
    // The old site's book lists, or failing that a book named in the title, e.g. "Psalm 124".
    const fromTitle = bookFromPassage(passageFromTitle(sermon.title));
    sermon.books = bookOf.get(sermon.legacyId) ?? (fromTitle ? [fromTitle] : []);
    if (sermon.books.length) withBook++;
  }
  console.log(`\n  ${withBook} of ${found.length} have a Bible book.`);

  const problems = found.filter((s) => !s.date);
  if (problems.length) console.warn(`  ${problems.length} sermons have no date; they’ll be skipped:`, problems.map((s) => s.legacyId).join(", "));

  if (DRY_RUN) {
    await writeFile("media-import-preview.json", JSON.stringify(found, null, 2));
    console.log("Saved what was found to media-import-preview.json. Nothing was changed.");
    return;
  }

  const store = supabase();
  const audio = NO_AUDIO ? undefined : r2();
  const index = await loadIndex(store);
  const byId = new Map(index.map((s) => [s.id, s]));
  // Sermons already added on the new site (e.g. created from YouTube livestreams) for the same
  // date and service are merged into, rather than duplicated.
  const bySlot = new Map(index.filter((s) => !s.legacyId && s.service).map((s) => [`${s.date} ${s.service}`, s]));
  let merged = 0;
  let copied = 0;
  let failed = 0;

  for (const [i, item] of found.entries()) {
    if (!item.date) continue;
    const sameSlot = !byId.has(item.legacyId) && item.service ? bySlot.get(`${item.date} ${item.service}`) : undefined;
    const existing = byId.get(item.legacyId) ?? sameSlot;
    const sermon = sameSlot
      ? {
          // Keep what was entered on the new site; fill in anything missing from the old site.
          ...sameSlot,
          legacyId: item.legacyId,
          title: sameSlot.title || item.title,
          preacher: sameSlot.preacher || item.preacher,
          books: booksOf(sameSlot).length ? booksOf(sameSlot) : item.books,
          book: undefined,
        }
      : {
          ...existing,
          id: item.legacyId, // keep the old site's number, so old links can be redirected
          legacyId: item.legacyId,
          title: item.title,
          date: item.date,
          service: item.service,
          preacher: item.preacher,
          books: item.books,
          book: undefined,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        };
    if (sameSlot) {
      merged++;
      bySlot.delete(`${item.date} ${item.service}`);
    }

    if (audio && item.fileName && (FORCE_AUDIO || !existing?.audioKey)) {
      const key = `sermons/${item.date.slice(0, 4)}/${item.date}${item.service ? `-${item.service}` : ""}-${slug(item.title)}-${item.legacyId}.mp3`;
      try {
        let size;
        let alreadyThere = false;
        if (!FORCE_AUDIO) {
          try {
            const head = await audio.client.send(new HeadObjectCommand({ Bucket: audio.bucket, Key: key }));
            size = head.ContentLength;
            alreadyThere = true;
          } catch {}
        }
        if (!alreadyThere) {
          const response = await fetch(`${SOURCE}/?download&file_name=${encodeURIComponent(item.fileName)}`);
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
          const buffer = Buffer.from(await response.arrayBuffer());
          if (buffer.length < 10_000) throw new Error("the file is missing or empty on the old site");
          await audio.client.send(new PutObjectCommand({
            Bucket: audio.bucket,
            Key: key,
            Body: buffer,
            ContentType: "audio/mpeg",
            ContentDisposition: contentDisposition(`${item.date} ${item.title} - ${item.preacher}.mp3`),
          }));
          size = buffer.length;
          sermon.duration = await audioDuration(buffer);
          copied++;
        }
        sermon.audioKey = key;
        sermon.audioSize = size;
      } catch (error) {
        failed++;
        console.warn(`\n  Audio for sermon ${item.legacyId} (“${item.title}”) wasn’t copied: ${error.message}`);
      }
    }

    byId.set(sermon.id, sermon);
    process.stdout.write(`\r  saving ${i + 1} of ${found.length} (${copied} audio files copied)`);
    // Save as we go, so an interrupted run loses nothing.
    if ((i + 1) % 25 === 0) await saveIndex(store, [...byId.values()]);
  }
  await saveIndex(store, [...byId.values()]);
  console.log(
    `\nDone. ${byId.size} sermons in the list${merged ? ` (${merged} merged into sermons already on the new site)` : ""}; ` +
      `${copied} audio files copied${failed ? `, ${failed} failed (run again to retry)` : ""}.`,
  );
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  main().catch((error) => {
    console.error(`\n${error.message}`);
    process.exit(1);
  });
}
