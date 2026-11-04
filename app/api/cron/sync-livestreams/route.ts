import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { syncLivestreams } from "@/lib/livestreams";
import { youtubeIsConfigured } from "@/lib/youtube";

// Called once a day by Vercel (see vercel.json) to refresh the list of past YouTube livestreams.
// Vercel sends "Authorization: Bearer <CRON_SECRET>"; anything else is refused.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  if (!youtubeIsConfigured()) return NextResponse.json({ skipped: "YOUTUBE_API_KEY isn’t set" });
  try {
    const { count, changedPaths } = await syncLivestreams();
    revalidatePath("/sermons");
    for (const path of changedPaths) revalidatePath(path);
    return NextResponse.json({ livestreams: count, sermonPagesUpdated: changedPaths.length });
  } catch (error) {
    console.error("Livestream sync failed", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
