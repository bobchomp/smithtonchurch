import "server-only";
import { site } from "./content";
import type { Livestream } from "./livestream-match";

// Reads the church's past livestreams from the YouTube Data API.
//
// Environment variable (set in Vercel): YOUTUBE_API_KEY, a free key from Google Cloud with the
// "YouTube Data API v3" enabled. A full check uses roughly 1 unit per 50 videos of the free
// 10,000 units a day.

const API = process.env.YOUTUBE_API_BASE?.replace(/\/+$/, "") || "https://www.googleapis.com/youtube/v3";

export function youtubeIsConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY?.trim());
}

// "@SmithtonChurchVideo" from the YouTube link in content/site.yml.
function channelHandle(): string {
  const handle = site.social.youtube.match(/@([\w.-]+)/)?.[1];
  if (!handle) throw new Error("The YouTube link in content/site.yml should be the channel’s @ address.");
  return handle;
}

async function call<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY!.trim() });
  const response = await fetch(`${API}/${endpoint}?${query}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!response.ok) throw new Error(`YouTube said: ${body.error?.message ?? response.statusText}`);
  return body;
}

// "PT1H2M3S" -> 3723
function seconds(iso: string | undefined): number | undefined {
  const m = iso?.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return undefined;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s || undefined;
}

type PlaylistPage = { nextPageToken?: string; items: { contentDetails: { videoId: string } }[] };
type VideosPage = {
  items: {
    id: string;
    snippet: { title: string; description?: string };
    contentDetails?: { duration?: string };
    liveStreamingDetails?: { actualStartTime?: string; actualEndTime?: string };
  }[];
};

// The church puts the preacher's name in each livestream's description: usually on its own, but
// sometimes after the sermon's title on the line above, e.g. "'Abiding'\nRev Alasdair Macleod".
// Lines that repeat the title, are in quotes, or don't look like a name (links, sentences) are
// skipped; a longer description (more than three lines) is ignored.
const NAME_PREFIX = /^(rev|revd|rev\.|the rev|dr|dr\.|pastor|mr|mrs|ms|miss|prof)\b/i;

function simplify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function preacherFrom(description: string | undefined, title = ""): string | undefined {
  const lines = (description ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0 || lines.length > 3) return undefined;
  const plainTitle = simplify(title);
  const candidates = lines.filter((line) => {
    if (line.length > 60 || /https?:|www\.|@/.test(line)) return false;
    if (/^['"‘’“”]/.test(line)) return false; // a quoted title
    if (plainTitle && simplify(line) && plainTitle.includes(simplify(line))) return false; // repeats the title
    if (/[.!?:]$/.test(line) && !NAME_PREFIX.test(line)) return false; // a sentence
    return true;
  });
  return candidates.find((line) => NAME_PREFIX.test(line)) ?? candidates[candidates.length - 1];
}

// Every finished livestream on the channel, newest first. (Uploads that weren't livestreams,
// and streams that haven't started or are still live, are left out.)
export async function fetchPastLivestreams(): Promise<Livestream[]> {
  if (!youtubeIsConfigured()) throw new Error("Add YOUTUBE_API_KEY in Vercel to connect YouTube.");
  const channels = await call<{ items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[] }>("channels", {
    part: "contentDetails",
    forHandle: channelHandle(),
  });
  const uploads = channels.items?.[0]?.contentDetails.relatedPlaylists.uploads;
  if (!uploads) throw new Error(`Couldn’t find the YouTube channel @${channelHandle()}.`);

  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await call<PlaylistPage>("playlistItems", {
      part: "contentDetails",
      playlistId: uploads,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    ids.push(...page.items.map((item) => item.contentDetails.videoId));
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < 20_000);

  const streams: Livestream[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const page = await call<VideosPage>("videos", {
      part: "snippet,contentDetails,liveStreamingDetails",
      id: ids.slice(i, i + 50).join(","),
      maxResults: "50",
    });
    for (const video of page.items) {
      const live = video.liveStreamingDetails;
      if (!live?.actualStartTime || !live.actualEndTime) continue;
      streams.push({
        id: video.id,
        title: video.snippet.title,
        startedAt: live.actualStartTime,
        duration: seconds(video.contentDetails?.duration),
        preacher: preacherFrom(video.snippet.description, video.snippet.title),
      });
    }
  }
  return streams.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
