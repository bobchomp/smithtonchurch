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
    snippet: { title: string };
    contentDetails?: { duration?: string };
    liveStreamingDetails?: { actualStartTime?: string; actualEndTime?: string };
  }[];
};

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
      });
    }
  }
  return streams.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
