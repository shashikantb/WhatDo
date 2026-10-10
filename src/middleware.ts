import { NextRequest, NextResponse } from "next/server";

/* =========================================================
   WhatDo Edge Middleware
   - NEVER throw. If anything breaks, fall through silently.
   - Goal: prevent Cloudflare 494 REQUEST_HEADER_TOO_LARGE
     by transparently wiping bloated session-cookie families
     BEFORE the cookie header grows past Cloudflare's ~8KB cap.
   ========================================================= */

const HEADER_BLOAT_BYTES = 6500; // trigger purge below CF's ~8KB hard limit
const KEEP_FAMILIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];
const PURGE_FAMILIES = [
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
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "__Secure-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.state",
  "next-auth.pkce.code_verifier",
  "whatdo_sess",
  "whatdo_ref",
];

// NOTE: Next.js 14 uses default middleware runtime on Vercel Edge.
// Do NOT set `export const runtime = "edge"` here; it causes build crash in 14.2.x.

function inFamily(name: string, families: readonly string[]): boolean {
  if (!name) return false;
  for (const f of families) {
    if (name === f) return true;
    if (name.length > f.length + 1 && name.startsWith(f + ".")) {
      const tail = name.substring(f.length + 1);
      // digit-only shard (.0, .1, …)
      let ok = tail.length > 0;
      for (let i = 0; ok && i < tail.length; i++) {
        const ch = tail.charCodeAt(i);
        if (ch < 48 || ch > 57) ok = false;
      }
      if (ok) return true;
    }
  }
  return false;
}

function latestKeepableCookie(cookieHeader: string): string | null {
  // Cookie: "name=value; name2=value2"
  const parts = cookieHeader.split(";");
  let bestName: string | null = null;
  let bestIat = -1;
  for (const raw of parts) {
    const eq = raw.indexOf("=");
    if (eq < 0) continue;
    const name = raw.substring(0, eq).trim();
    const val = raw.substring(eq + 1).trim();
    if (!inFamily(name, KEEP_FAMILIES)) continue;
    if (val.length < 20) continue;
    const iat = jwtPeekIat(val);
    if (iat > bestIat) {
      bestIat = iat;
      bestName = name;
    }
  }
  return bestName;
}

function jwtPeekIat(jwt: string): number {
  try {
    const dot1 = jwt.indexOf(".");
    if (dot1 < 0) return -1;
    const dot2 = jwt.indexOf(".", dot1 + 1);
    if (dot2 < 0) return -1;
    let payload = jwt.substring(dot1 + 1, dot2);
    payload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = (4 - (payload.length % 4)) % 4;
    if (pad) payload += "====".substring(0, pad);
    let decoded: string;
    try {
      // @ts-ignore - atob exists on Edge
      decoded = atob(payload);
    } catch {
      return -1;
    }
    // Lightweight JSON parse — avoid loading heavy JSON defs multiple times
    const obj = JSON.parse(decoded);
    if (obj && typeof obj.iat === "number") return obj.iat;
    return -1;
  } catch {
    return -1;
  }
}

function purgeSetCookie(res: NextResponse, names: Iterable<string>, host: string, secure: boolean, keepName: string | null) {
  const paths = ["/"];
  for (const name of names) {
    if (keepName && name === keepName) continue;
    for (const path of paths) {
      safeExpire(res, name, path, undefined, secure, true, "lax");
      safeExpire(res, name, path, undefined, secure, true, "strict");
      if (secure) safeExpire(res, name, path, undefined, true, true, "none");
      safeExpire(res, name, path, undefined, secure, false, "lax");
      safeExpire(res, name, path, host, secure, true, "lax");
      safeExpire(res, name, path, host, secure, false, "lax");
    }
  }
}

function safeExpire(
  res: NextResponse,
  name: string,
  path: string,
  domain: string | undefined,
  secure: boolean,
  httpOnly: boolean,
  sameSite: "lax" | "strict" | "none"
) {
  try {
    const expires = new Date(0);
    const opts: any = { path, expires, maxAge: 0, httpOnly, sameSite, secure };
    if (domain) opts.domain = domain;
    res.cookies.set(name, "", opts);
  } catch {}
}

const PROTECTED = ["/feed", "/ask", "/notifications", "/saved", "/settings", "/profile/me"];

export default function middleware(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname || "/";
    const secure = (req.headers.get("x-forwarded-proto") || "").toLowerCase() === "https" ||
      (process.env.NODE_ENV === "production");
    const host = (req.headers.get("x-forwarded-host") || req.nextUrl.hostname || "").trim();
    const cookieHeader = req.headers.get("cookie") || "";
    const cookieBytes = cookieHeader.length; // rough but accurate enough for ~8KB threshold

    // 1) Bloated cookies? → purge all auth shards except newest valid session, redirect.
    if (cookieBytes > HEADER_BLOAT_BYTES && path !== "/clear-session" && !path.startsWith("/api/")) {
      const keep = latestKeepableCookie(cookieHeader);
      const allNames = collectCookieNames(cookieHeader);
      const namesToPurge: string[] = [];
      for (const n of allNames) if (inFamily(n, PURGE_FAMILIES)) namesToPurge.push(n);
      if (namesToPurge.length || true) {
        // add all possible shards regardless of whether present this request
        for (const fam of PURGE_FAMILIES) {
          namesToPurge.push(fam);
          for (let k = 0; k < 12; k++) namesToPurge.push(fam + "." + k);
        }
      }
      const dest = new URL(req.nextUrl);
      dest.searchParams.set("p", "1");
      const r = NextResponse.redirect(dest.toString(), 302);
      purgeSetCookie(r, dedupe(namesToPurge), host, secure, keep);
      return r;
    }

    // 2) Referral tracking
    const ref = req.nextUrl.searchParams.get("ref");
    if (ref && typeof ref === "string" && ref.length > 0 && ref.length < 120) {
      const clean = new URL(req.nextUrl);
      clean.searchParams.delete("ref");
      const r = NextResponse.redirect(clean.toString(), 302);
      try {
        r.cookies.set("whatdo_ref", ref, {
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
          httpOnly: true,
          sameSite: "lax",
          secure,
        });
      } catch {}
      return r;
    }

    // 3) Logged in? → parse newest session JWT's role (lightweight peek only)
    const latestName = latestKeepableCookie(cookieHeader);
    const isLoggedIn = !!latestName;
    let role: "ADMIN" | "MODERATOR" | "USER" | null = null;
    if (isLoggedIn) {
      const val = readCookieValue(cookieHeader, latestName!);
      const payload = (() => {
        try {
          const a = val.indexOf("."); const b = val.indexOf(".", a + 1);
          let p = val.substring(a + 1, b);
          p = p.replace(/-/g, "+").replace(/_/g, "/");
          const pad = (4 - (p.length % 4)) % 4; if (pad) p += "====".substring(0, pad);
          // @ts-ignore
          return JSON.parse(atob(p));
        } catch { return null; }
      })();
      const r = String((payload as any)?.r ?? (payload as any)?.role ?? (payload as any)?.userRole ?? (payload as any)?.data?.user?.role ?? (payload as any)?.user?.role ?? "");
      if (r === "ADMIN" || r === "MODERATOR" || r === "USER") role = r;
      else role = "USER";
    }

    const isAdmin = role === "ADMIN";
    const isModOrAdmin = role === "MODERATOR" || isAdmin;
    void isModOrAdmin;

    if (path.startsWith("/admin") && !isLoggedIn) {
      const login = new URL("/login", req.nextUrl);
      login.searchParams.set("callbackUrl", path + req.nextUrl.search);
      return NextResponse.redirect(login.toString(), 302);
    }
    if (!isLoggedIn) {
      for (const prefix of PROTECTED) {
        if (path.startsWith(prefix)) {
          const login = new URL("/login", req.nextUrl);
          login.searchParams.set("callbackUrl", path + req.nextUrl.search);
          return NextResponse.redirect(login.toString(), 302);
        }
      }
    }
    if (path === "/login" && isLoggedIn) {
      return NextResponse.redirect(new URL("/feed", req.nextUrl).toString(), 302);
    }

    // Optional: light cleanup of auth orphans even under threshold (no redirect, just next + set-cookie)
    const authCount = countAuthCookies(cookieHeader);
    if (authCount > 3) {
      const keep = latestName;
      const namesToPurge: string[] = [];
      for (const fam of PURGE_FAMILIES) {
        namesToPurge.push(fam);
        for (let k = 0; k < 12; k++) namesToPurge.push(fam + "." + k);
      }
      const r = NextResponse.next();
      purgeSetCookie(r, dedupe(namesToPurge), host, secure, keep);
      return r;
    }

    return NextResponse.next();
  } catch {
    // Fail open — never surface MIDDLEWARE_INVOCATION_FAILED to user.
    try { return NextResponse.next(); } catch { return new Response(null, { status: 204 }); }
  }
}

function readCookieValue(header: string, target: string): string {
  for (const raw of header.split(";")) {
    const eq = raw.indexOf("=");
    if (eq < 0) continue;
    const name = raw.substring(0, eq).trim();
    if (name === target) return raw.substring(eq + 1).trim();
  }
  return "";
}

function collectCookieNames(header: string): string[] {
  const out: string[] = [];
  for (const raw of header.split(";")) {
    const eq = raw.indexOf("=");
    if (eq < 0) continue;
    out.push(raw.substring(0, eq).trim());
  }
  return out;
}

function countAuthCookies(header: string): number {
  let n = 0;
  for (const raw of header.split(";")) {
    const eq = raw.indexOf("=");
    if (eq < 0) continue;
    const name = raw.substring(0, eq).trim();
    if (inFamily(name, PURGE_FAMILIES)) n++;
  }
  return n;
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest|sitemap|robots|opengraph|public|p).*)",
  ],
};
