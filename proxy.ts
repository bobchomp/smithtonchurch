import { NextResponse, type NextRequest } from "next/server";

// Keeps the admin panel on its own subdomain:
//   admin.smithtonchurch.com/            -> admin.smithtonchurch.com/admin/
//   admin.smithtonchurch.com/<website>   -> smithtonchurch.com/<website>
//   smithtonchurch.com/admin/...         -> admin.smithtonchurch.com/admin/...
// On any other address (Vercel previews, localhost) the admin panel is simply at /admin/.

const SITE_HOST = "smithtonchurch.com";
const ADMIN_HOST = `admin.${SITE_HOST}`;
const MAIN_HOSTS = [SITE_HOST, `www.${SITE_HOST}`];

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
  // Skip Next's own files and the public images and documents.
  matcher: ["/((?!_next/|images/|docs/|sitemap.xml|robots.txt).*)"],
};
