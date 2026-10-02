import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "authjs.session-token";
export const SESSION_COOKIE_NAME_CS = "authjs.csrf-token";

function allSessionCookies(req: NextRequest): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = [];
  try {
    for (const c of req.cookies.getAll()) {
      if (
        c.name === SESSION_COOKIE_NAME ||
        c.name.startsWith(SESSION_COOKIE_NAME + ".") ||
        c.name === "__Secure-" + SESSION_COOKIE_NAME ||
        c.name.startsWith("__Secure-" + SESSION_COOKIE_NAME + ".")
      ) {
        out.push({ name: c.name, value: c.value });
      }
    }
  } catch {}
  return out;
}

function safeB64UrlDecode(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  if (typeof atob === "function") return atob(s);
  return Buffer.from(s, "base64").toString("utf8");
}

function parseJWTPayload(jwt: string): any | null {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    return JSON.parse(safeB64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

function getSessionCookie(req: NextRequest): { name: string; value: string; payload: any } | null {
  const all = allSessionCookies(req);
  if (!all.length) return null;
  let best: { name: string; value: string; payload: any; iat: number } | null = null;
  for (const c of all) {
    const p = parseJWTPayload(c.value);
    if (!p) continue;
    const iat = Number(p.iat ?? 0);
    if (!best || iat > best.iat) best = { name: c.name, value: c.value, payload: p, iat };
  }
  const first = all[0];
  if (best) return { name: best.name, value: best.value, payload: best.payload };
  if (!first) return null;
  return { name: first.name, value: first.value, payload: null };
}

function readSessionRoleFromCookie(req: NextRequest): "ADMIN" | "MODERATOR" | "USER" | null {
  const s = getSessionCookie(req);
  if (!s) return null;
  const r = (s.payload?.r ?? s.payload?.userRole ?? s.payload?.data?.user?.role ?? s.payload?.user?.role) as string | undefined;
  if (r === "ADMIN" || r === "MODERATOR" || r === "USER") return r;
  return "USER";
}

function purgeBloatedCookies(res: NextResponse, req: NextRequest) {
  const secure = process.env.NODE_ENV === "production";
  const proto = secure ? "https://" : "http://";
  const host = req.headers.get("x-forwarded-host") || req.nextUrl.host;
  const domain = (req.headers.get("x-forwarded-host") || req.nextUrl.hostname) || undefined;

  const all = allSessionCookies(req);
  const keep = getSessionCookie(req);

  for (const c of all) {
    if (keep && c.name === keep.name) continue;
    res.cookies.set({
      name: c.name,
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure,
      expires: new Date(0),
      maxAge: 0,
      ...(domain && { domain }),
    } as any);
  }

  for (const c of req.cookies.getAll()) {
    if (c.name.startsWith("__Secure-authjs.") && c.name !== keep?.name) {
      if (all.some((s) => s.name === c.name)) continue;
      res.cookies.set({
        name: c.name,
        value: "",
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        expires: new Date(0),
        maxAge: 0,
        ...(domain && { domain }),
      } as any);
    }
  }
  void proto; void host;
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

  if (isAdminRoute && !isLoggedIn) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    const r = NextResponse.redirect(login);
    purgeBloatedCookies(r, req);
    return r;
  }

  if (isProtectedRoute && !isLoggedIn) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    const r = NextResponse.redirect(login);
    purgeBloatedCookies(r, req);
    return r;
  }

  if (path === "/login" && isLoggedIn) {
    const r = NextResponse.redirect(new URL("/feed", req.nextUrl));
    purgeBloatedCookies(r, req);
    return r;
  }

  const ref = req.nextUrl.searchParams.get("ref");
  if (ref && typeof ref === "string" && ref.length > 0) {
    const cleanUrl = new URL(req.nextUrl);
    cleanUrl.searchParams.delete("ref");
    const redirectTo = cleanUrl.toString();
    const res = NextResponse.redirect(redirectTo);
    res.cookies.set("whatdo_ref", ref, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    purgeBloatedCookies(res, req);
    return res;
  }

  const allCookies = allSessionCookies(req);
  const needsPurge = allCookies.length > 1 || allCookies.some((c) => c.value.length > 4200);
  if (needsPurge) {
    const r = NextResponse.next();
    purgeBloatedCookies(r, req);
    return r;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest|sitemap|robots|opengraph|public|p).*)",
  ],
};

