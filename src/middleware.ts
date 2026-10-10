import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "authjs.session-token";
export const SESSION_COOKIE_NAME_CS = "authjs.csrf-token";
export const LEGACY_SESSION_COOKIE_NAME = "next-auth.session-token";

const SESSION_FAMILIES = [
  // NextAuth v5 / Auth.js
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.csrf-token",
  "__Secure-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "authjs.state",
  "__Secure-authjs.state",
  "authjs.pkce.code_verifier",
  "__Secure-authjs.pkce.code_verifier",
  // NextAuth v4 legacy (still present after sign-in-key rotations, cause 494 header bloat)
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "__Secure-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.state",
  "next-auth.pkce.code_verifier",
  // Our app cookies
  "whatdo_sess",
  "whatdo_ref",
];

function cookieNameMatchesSessionFamily(name: string): boolean {
  if (!name) return false;
  for (const base of SESSION_FAMILIES) {
    if (name === base) return true;
    // sharded cookie names: authjs.session-token.0, next-auth.session-token.2, etc.
    if (name.startsWith(base + ".")) {
      const tail = name.slice(base.length + 1);
      if (/^\d+$/.test(tail)) return true;
    }
  }
  return false;
}

function allAuthAndAppCookies(req: NextRequest): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = [];
  try {
    for (const c of req.cookies.getAll()) {
      if (cookieNameMatchesSessionFamily(c.name)) {
        out.push({ name: c.name, value: c.value });
      }
    }
  } catch {}
  return out;
}

function estimateCookieHeaderBytes(cookies: { name: string; value: string }[]): number {
  // Cookie header format: "name=value; name2=value2\r\n"
  let total = 0;
  for (let i = 0; i < cookies.length; i++) {
    total += cookies[i].name.length + 1 + cookies[i].value.length;
    if (i < cookies.length - 1) total += 2; // "; " separator
  }
  // Add small slack for other headers / cookies not tracked above
  return total + 800;
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

const KEEPABLE_SESSION_BASES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function keepableSessionCookies(req: NextRequest): { name: string; value: string; iat: number }[] {
  const all = allAuthAndAppCookies(req);
  const keep: { name: string; value: string; iat: number }[] = [];
  for (const c of all) {
    const base = c.name.split(".")[0] ?? c.name;
    if (!KEEPABLE_SESSION_BASES.includes(base) && !KEEPABLE_SESSION_BASES.includes(c.name)) continue;
    const p = parseJWTPayload(c.value);
    const iat = p && typeof p.iat === "number" ? p.iat : 0;
    keep.push({ name: c.name, value: c.value, iat });
  }
  keep.sort((a, b) => b.iat - a.iat);
  return keep;
}

function purgeAuthCookies(res: NextResponse, req: NextRequest, opts: { keep?: Set<string>; keepLatestOnly?: boolean } = {}) {
  const secure = process.env.NODE_ENV === "production";
  const host = (req.headers.get("x-forwarded-host") || req.nextUrl.hostname || "").trim();
  const candidateDomains: string[] = [];
  if (host) candidateDomains.push(host);
  // NOTE: We intentionally do NOT set domain=.co.in (or other public suffixes) — it's blocked.
  // Set only the exact host. Browsers auto-match subdomains on an exact host cookie when appropriate.

  const namesToRemove = new Set<string>();
  for (const c of allAuthAndAppCookies(req)) namesToRemove.add(c.name);
  for (const base of SESSION_FAMILIES) {
    namesToRemove.add(base);
    for (let k = 0; k < 20; k++) namesToRemove.add(`${base}.${k}`);
  }

  let keepNames = new Set<string>(opts.keep ?? []);
  if (opts.keepLatestOnly) {
    const latest = keepableSessionCookies(req)[0];
    if (latest) keepNames.add(latest.name);
  }

  const allPaths = ["/"];
  for (const cn of Array.from(namesToRemove)) {
    if (keepNames.has(cn)) continue;
    for (const ph of allPaths) {
      // 1) The canonical form: httpOnly + lax + correct secure flag (most common)
      try {
        res.cookies.set(cn, "", { path: ph, expires: new Date(0), maxAge: 0, httpOnly: true, sameSite: "lax", secure });
      } catch {}
      // 2) Strict samesite variant
      try {
        res.cookies.set(cn, "", { path: ph, expires: new Date(0), maxAge: 0, httpOnly: true, sameSite: "strict", secure });
      } catch {}
      // 3) SameSite=none (for cross-origin callbacks) only valid with secure=true
      if (secure) {
        try {
          res.cookies.set(cn, "", { path: ph, expires: new Date(0), maxAge: 0, httpOnly: true, sameSite: "none", secure: true });
        } catch {}
      }
      // 4) Non-httpOnly (covers JS-set whatdo_sess, csrf tokens, etc.)
      try {
        res.cookies.set(cn, "", { path: ph, expires: new Date(0), maxAge: 0, sameSite: "lax", secure });
      } catch {}
      // — domain variants (exact host only; skip wildcard PSL suffixes)
      for (const d of candidateDomains) {
        try {
          res.cookies.set(cn, "", { path: ph, expires: new Date(0), maxAge: 0, httpOnly: true, sameSite: "lax", secure, domain: d });
        } catch {}
        try {
          res.cookies.set(cn, "", { path: ph, expires: new Date(0), maxAge: 0, sameSite: "lax", secure, domain: d });
        } catch {}
        if (secure) {
          try {
            res.cookies.set(cn, "", { path: ph, expires: new Date(0), maxAge: 0, httpOnly: true, sameSite: "none", secure: true, domain: d });
          } catch {}
        }
      }
    }
  }
}

export default function middleware(req: NextRequest) {
  try {
    return _middleware(req);
  } catch (err: any) {
    // NEVER let a middleware crash surface 500 to the user.
    // If purge logic misbehaves on Edge, fall through to Next.js.
    try {
      const r = NextResponse.next();
      try {
        r.headers.set("X-WD-Mw-Fallback", "1");
        const msg = typeof err?.message === "string" ? err.message.slice(0, 90) : String(err ?? "unknown").slice(0, 90);
        r.headers.set("X-WD-Mw-Err", encodeURIComponent(msg));
      } catch {}
      return r;
    } catch {
      return NextResponse.next();
    }
  }
}

function _middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  // Role resolution — allow middleware to still do auth checks after purge decisions
  const latestSession = keepableSessionCookies(req)[0];
  let role: "ADMIN" | "MODERATOR" | "USER" | null = null;
  if (latestSession) {
    const p = parseJWTPayload(latestSession.value);
    const r = (p?.r ?? p?.role ?? p?.userRole ?? p?.data?.user?.role ?? p?.user?.role) as string | undefined;
    if (r === "ADMIN" || r === "MODERATOR" || r === "USER") role = r;
    else role = "USER";
  }
  const isLoggedIn = role !== null;

  // Aggressive cookie-size guard BEFORE any routing:
  // If total estimated cookie header size exceeds 6.5KB (Cloudflare hard max is ~8KB),
  // delete ALL old auth / app cookies, keep only newest valid session shard,
  // redirect to same path to drop the 494 before it reaches CF.
  const relevantCookies = allAuthAndAppCookies(req);
  const estBytes = estimateCookieHeaderBytes(relevantCookies);
  const tooManyCookies = relevantCookies.length > 3; // more than 3 auth cookies = almost always shard leftovers
  if (estBytes > 6500 || tooManyCookies) {
    const safeRedirectTo = new URL(req.nextUrl);
    // Don't bounce on clear-session page itself (would cause loop)
    if (path !== "/clear-session" && !path.startsWith("/api/")) {
      safeRedirectTo.searchParams.set("c", String(relevantCookies.length));
      safeRedirectTo.searchParams.set("b", String(estBytes));
      const redir = NextResponse.redirect(safeRedirectTo.toString(), 302);
      purgeAuthCookies(redir, req, { keepLatestOnly: true });
      return redir;
    }
  }

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
    const r = NextResponse.redirect(login.toString(), 302);
    purgeAuthCookies(r, req, { keepLatestOnly: true });
    return r;
  }

  if (isProtectedRoute && !isLoggedIn) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    const r = NextResponse.redirect(login.toString(), 302);
    purgeAuthCookies(r, req, { keepLatestOnly: true });
    return r;
  }

  if (path === "/login" && isLoggedIn) {
    const r = NextResponse.redirect(new URL("/feed", req.nextUrl).toString(), 302);
    purgeAuthCookies(r, req, { keepLatestOnly: true });
    return r;
  }

  const ref = req.nextUrl.searchParams.get("ref");
  if (ref && typeof ref === "string" && ref.length > 0) {
    const cleanUrl = new URL(req.nextUrl);
    cleanUrl.searchParams.delete("ref");
    const redirectTo = cleanUrl.toString();
    const res = NextResponse.redirect(redirectTo, 302);
    try {
      res.cookies.set("whatdo_ref", ref, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
    } catch {}
    purgeAuthCookies(res, req, { keepLatestOnly: true });
    return res;
  }

  // Lightweight keep-latest pass on every request so shards don't accumulate.
  if (tooManyCookies) {
    const r = NextResponse.next();
    purgeAuthCookies(r, req, { keepLatestOnly: true });
    return r;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest|sitemap|robots|opengraph|public|p).*)",
  ],
};

