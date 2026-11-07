import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_HOST, MAIN_HOSTS, SITE_HOST } from "./lib/domains";

// Keeps the admin panel on its own address:
//   admin.rossmdev.co.uk/            -> admin.rossmdev.co.uk/admin/
//   admin.rossmdev.co.uk/<website>   -> rossmdev.co.uk/<website>
//   rossmdev.co.uk/admin/...         -> admin.rossmdev.co.uk/admin/...
// The addresses are set in lib/domains.ts.
// On any other address (Vercel previews, localhost) the admin panel is simply at /admin/.

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const { pathname, search } = request.nextUrl;
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  if (host === ADMIN_HOST && !isAdminPath) {
    if (pathname === "/") return NextResponse.redirect(new URL("/admin/", request.url));
    return NextResponse.redirect(new URL(pathname + search, `https://${SITE_HOST}`));
  }

  if (MAIN_HOSTS.includes(host) && isAdminPath) {
    return NextResponse.redirect(new URL(pathname + search, `https://${ADMIN_HOST}`));
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next's own files and the public images, documents and holding videos.
  matcher: ["/((?!_next/|images/|docs/|holding-videos/|sitemap.xml|robots.txt).*)"],
};
