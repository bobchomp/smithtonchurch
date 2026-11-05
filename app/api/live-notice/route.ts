import { getCurrentPublicNotice } from "@/lib/live-notices";

// The notice showing on the Watch Live page right now (checked by the page every minute). Cached
// for up to 30 seconds so busy Sundays don't each hit storage.
export const dynamic = "force-dynamic";

export async function GET() {
  const notice = await getCurrentPublicNotice();
  return Response.json(
    { notice },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=30" } },
  );
}
