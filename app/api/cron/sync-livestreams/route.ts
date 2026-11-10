import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { logActivity, SYSTEM } from "@/lib/activity";
import { syncLivestreams } from "@/lib/livestreams";
import { youtubeIsConfigured } from "@/lib/youtube";

// Refreshes the list of past YouTube livestreams. Called once a day by cron-job.org, which sends
// the header "Authorization: Bearer <CRON_SECRET>"; anything else is refused. See README.md.

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization")?.trim() ?? "";
  if (!secret) return false;
  // Compare hashes so the check takes the same time whatever is sent.
  const hash = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(hash(header), hash(`Bearer ${secret}`));
}

export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  if (!youtubeIsConfigured()) return NextResponse.json({ skipped: "YOUTUBE_API_KEY isn’t set" });
  try {
    const { count, changedPaths, created } = await syncLivestreams();
    await logActivity({ area: "Livestreams", action: "Scheduled YouTube check", details: { livestreams: count, sermonsCreated: created.length } }, SYSTEM);
    revalidatePath("/sermons");
    if (created.length) revalidatePath("/"); // the home page shows the latest sermon
    for (const path of changedPaths) revalidatePath(path);
    return NextResponse.json({ livestreams: count, sermonsCreated: created.map((s) => s.title), sermonPagesUpdated: changedPaths.length });
  } catch (error) {
    console.error("Livestream sync failed", error);
    await logActivity({ area: "Livestreams", action: "Scheduled YouTube check failed", details: { error: (error as Error).message } }, SYSTEM);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// cron-job.org can also be set to POST.
export const POST = GET;
