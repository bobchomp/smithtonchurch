import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { HOLDING_SLIDES, PUBLIC_SLIDES_KEY } from "@/lib/holding-slides";

// The holding slides' full-size PNGs at public but unlisted addresses (/holding-slides/<key>/<slide>/<file>.png),
// for pasting into streaming software. Only files listed in lib/holding-slides.ts, and only with the right key.
export async function GET(_request: Request, { params }: { params: Promise<{ key: string; path: string[] }> }) {
  const { key, path } = await params;
  const [slideKey, name, ...rest] = path;
  const match = /^([a-z0-9-]+)\.png$/.exec(name ?? "");
  const slide = HOLDING_SLIDES.find((s) => s.key === slideKey);
  const known = match && slide?.revisions.some((r) => r.files.some((f) => f.file === match[1]));
  if (key !== PUBLIC_SLIDES_KEY || rest.length || !match || !slide || !known) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(join(process.cwd(), "holding-slides", slide.key, `${match[1]}.png`));
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=86400",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
