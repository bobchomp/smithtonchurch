import { NextResponse } from "next/server";
import { oldSermonListTarget } from "@/lib/old-sermon-urls";
import { getPublicSermons } from "@/lib/sermons";

// The old website's sermon lists (/sermons/book/john/, /sermons/minister/<name>/, /sermons/series/<name>/
// and so on), sent permanently to the sermon archive with the matching filter or search.
export async function GET(request: Request, { params }: { params: Promise<{ sermon: string; name: string }> }) {
  const { sermon: kind, name } = await params;
  const known = ["book", "minister", "series", "service-type", "topics", "page", "preacher"].includes(kind);
  const target = known && /^[a-z0-9-]{1,100}$/.test(name) ? oldSermonListTarget(kind, name, await getPublicSermons()) : "/sermons/";
  return NextResponse.redirect(new URL(target, request.url), {
    status: 308,
    headers: { "cache-control": "public, max-age=3600, s-maxage=86400" },
  });
}
