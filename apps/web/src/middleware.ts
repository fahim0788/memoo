import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hasToken = request.cookies.get("has_token")?.value;
  const { pathname } = request.nextUrl;

  // Authenticated user on /login → redirect to home
  if (pathname === "/login" && hasToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Unauthenticated user on protected page → redirect to login
  if (pathname !== "/login" && !hasToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all pages except:
     * - API routes (/api/...)
     * - Static files (_next, favicon, images, manifest, sw, etc.)
     */
    "/((?!api|_next|favicon|logo-|manifest|sw\\.js|storage|icons|auth|privacy).*)",
  ],
};
