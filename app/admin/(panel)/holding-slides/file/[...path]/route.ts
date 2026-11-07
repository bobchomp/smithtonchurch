import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { requireTool } from "@/lib/admin-auth";
import { HOLDING_SLIDES } from "@/lib/holding-slides";

// The holding slide images, for signed-in admins only. ?download=1 saves the file with a clear name.
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  await requireTool("holding-slides");
  const [slideKey, name] = (await params).path;
  const match = /^([a-z0-9-]+)\.(png|jpg)$/.exec(name ?? "");
  const slide = HOLDING_SLIDES.find((s) => s.key === slideKey);
  const known = match && slide?.revisions.some((r) => r.files.some((f) => f.file === match[1]));
  if (!match || !slide || !known) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(join(process.cwd(), "holding-slides", slide.key, `${match[1]}.${match[2]}`));
    const headers: Record<string, string> = {
      "content-type": match[2] === "png" ? "image/png" : "image/jpeg",
      "cache-control": "private, max-age=86400",
    };
    if (new URL(request.url).searchParams.has("download")) {
      headers["content-disposition"] = `attachment; filename="${slide.key}-${match[1]}.${match[2]}"`;
    }
    return new Response(new Uint8Array(data), { headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
