import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "authjs.session-token";
export const SESSION_COOKIE_NAME_CS = "authjs.csrf-token";

function getSessionCookie(req: NextRequest): string | undefined {
  const c = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (c) return c;
  return req.cookies.get("__Secure-" + SESSION_COOKIE_NAME)?.value;
}

function readSessionRoleFromCookie(req: NextRequest): "ADMIN" | "MODERATOR" | "USER" | null {
  const raw = getSessionCookie(req);
  if (!raw) return null;
  try {
    const decoded = JSON.parse(raw);
    const r = decoded?.data?.user?.role ?? decoded?.user?.role;
    if (r === "ADMIN" || r === "MODERATOR" || r === "USER") return r;
  } catch {
  }
  return raw ? "USER" : null;
}

export default function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const role = readSessionRoleFromCookie(req);
  const isLoggedIn = role !== null;

  const isProtectedRoute =
    path.startsWith("/feed") ||
    path.startsWith("/ask") ||
    path.startsWith("/notifications") ||
    path.startsWith("/saved") ||
    path.startsWith("/settings") ||
    path.startsWith("/profile/me");

  const isAdminRoute = path.startsWith("/admin");

  if (isAdminRoute && (!isLoggedIn || role !== "ADMIN")) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  if (isProtectedRoute && !isLoggedIn) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  if (path === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/feed", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest|sitemap|robots|opengraph|public|p).*)",
  ],
};
