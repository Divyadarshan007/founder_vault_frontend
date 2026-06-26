import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const cookie = req.cookies.get("fv_auth")?.value;
  let hasToken = false;

  if (cookie) {
    try {
      const { token } = JSON.parse(decodeURIComponent(cookie));
      hasToken = !!token;
    } catch {}
  }

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  if (!hasToken && !isPublic && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (hasToken && (isPublic || pathname === "/")) {
    return NextResponse.redirect(new URL("/founder/content", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
