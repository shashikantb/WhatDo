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

function latestKeepableCookie(cookieHeader: string): { name: string; base: string; shardIndex: number | null; iat: number } | null {
  // Cookie: "name=value; name2=value2"
  const parts = cookieHeader.split(";");
  type C = { name: string; base: string; shardIndex: number | null; value: string; iat: number };
  const list: C[] = [];
  for (const raw of parts) {
    const eq = raw.indexOf("=");
    if (eq < 0) continue;
    const name = raw.substring(0, eq).trim();
    const val = raw.substring(eq + 1).trim();
    let matchedBase: string | null = null;
    let shardIndex: number | null = null;
    for (const f of KEEP_FAMILIES) {
      if (name === f) {
        matchedBase = f;
        break;
      }
      if (name.length > f.length + 1 && name.startsWith(f + ".")) {
        const tail = name.substring(f.length + 1);
        // digit-only shard
        let isShard = tail.length > 0;
        for (let i = 0; isShard && i < tail.length; i++) {
          const ch = tail.charCodeAt(i);
          if (ch < 48 || ch > 57) isShard = false;
        }
        if (isShard) {
          matchedBase = f;
          shardIndex = parseInt(tail, 10);
          break;
        }
      }
    }
    if (!matchedBase) continue;
    if (val.length < 20) continue;
    const iat = jwtPeekIat(val);
    list.push({ name, base: matchedBase, shardIndex, value: val, iat: Math.max(iat, 0) });
  }
  if (!list.length) return null;
  // Pick the newest by iat (tie-break: lower shardIndex = earlier in the JWT stream)
  list.sort((a, b) => {
    if (b.iat !== a.iat) return b.iat - a.iat;
    const ai = a.shardIndex ?? -1;
    const bi = b.shardIndex ?? -1;
    return ai - bi;
  });
  const best = list[0];
  return { name: best.name, base: best.base, shardIndex: best.shardIndex, iat: best.iat };
}

/**
 * Shard-safe purge: if we're keeping `.3` of base "__Secure-authjs.session-token",
 * keep ALL siblings `.0, .1, .2, .3, …, .max(n)` from the SAME base family,
 * because NextAuth shards a single JWT across multiple cookies and needs all parts.
 * Only drop older iat duplicate sets (e.g., a previous session's `.0, .1, .2` with
 * an older iat) AND cookie families that are NOT in our keep-family (csrf/callback/state/aux).
 */
function computeKeepSet(cookieHeader: string): Set<string> {
  const keep = new Set<string>();
  const latest = latestKeepableCookie(cookieHeader);
  if (!latest) return keep;
  keep.add(latest.name);
  const parts = cookieHeader.split(";");
  // First pass: group all cookies by base family + collect shard indexes for the same iat as latest
  const shardIndexes = new Set<number>();
  if (latest.shardIndex !== null && latest.shardIndex !== undefined) {
    shardIndexes.add(latest.shardIndex);
    for (const raw of parts) {
      const eq = raw.indexOf("=");
      if (eq < 0) continue;
      const name = raw.substring(0, eq).trim();
      const val = raw.substring(eq + 1).trim();
      if (name === latest.name) continue;
      // Match same base family
      const prefix = latest.base + ".";
      if (!name.startsWith(prefix)) continue;
      const tail = name.substring(prefix.length);
      let isShard = tail.length > 0;
      let s = 0;
      for (let i = 0; i < tail.length; i++) {
        const ch = tail.charCodeAt(i);
        if (ch < 48 || ch > 57) { isShard = false; break; }
        s = s * 10 + (ch - 48);
      }
      if (!isShard) continue;
      const iat = jwtPeekIat(val);
      // Accept sibling shards if they have the same iat as latest, OR no iat available (newer authjs versions may
      // not duplicate header on later shards).
      if (iat === latest.iat || iat < 0) {
        shardIndexes.add(s);
        keep.add(name);
      }
    }
  }
  // Second pass: if latest wasn't a shard (single session cookie), still check for non-indexed duplicates with exact same base and keep all same iat
  if (latest.shardIndex === null || latest.shardIndex === undefined) {
    for (const raw of parts) {
      const eq = raw.indexOf("=");
      if (eq < 0) continue;
      const name = raw.substring(0, eq).trim();
      const val = raw.substring(eq + 1).trim();
      if (name === latest.name) continue;
      if (name !== latest.base) continue;
      const iat = jwtPeekIat(val);
      if (iat === latest.iat) keep.add(name);
    }
  }
  return keep;
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

function purgeSetCookie(res: NextResponse, names: Iterable<string>, host: string, secure: boolean, keepSet: Set<string> | string | null) {
  const paths = ["/"];
  for (const name of names) {
    if (typeof keepSet === "string") {
      if (keepSet && name === keepSet) continue;
    } else if (keepSet instanceof Set) {
      if (keepSet.has(name)) continue;
    }
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

function countDuplicateSessionSets(cookieHeader: string): number {
  const byIat = new Map<number, number>();
  const parts = cookieHeader.split(";");
  for (const raw of parts) {
    const eq = raw.indexOf("=");
    if (eq < 0) continue;
    const name = raw.substring(0, eq).trim();
    const val = raw.substring(eq + 1).trim();
    if (!inFamily(name, KEEP_FAMILIES)) continue;
    if (val.length < 20) continue;
    const iat = jwtPeekIat(val);
    if (iat <= 0) continue;
    byIat.set(iat, (byIat.get(iat) || 0) + 1);
  }
  return byIat.size;
}

function totalAuthCookieBytes(cookieHeader: string): number {
  let n = 0;
  const parts = cookieHeader.split(";");
  for (const raw of parts) {
    const eq = raw.indexOf("=");
    if (eq < 0) continue;
    const name = raw.substring(0, eq).trim();
    const val = raw.substring(eq + 1).trim();
    if (!inFamily(name, PURGE_FAMILIES)) continue;
    n += name.length + 1 + val.length + 2;
  }
  return n;
}

export default function middleware(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname || "/";
    const secure = (req.headers.get("x-forwarded-proto") || "").toLowerCase() === "https" ||
      (process.env.NODE_ENV === "production");
    const host = (req.headers.get("x-forwarded-host") || req.nextUrl.hostname || "").trim();
    const cookieHeader = req.headers.get("cookie") || "";
    const authBytes = totalAuthCookieBytes(cookieHeader);
    const numSessionIatGroups = countDuplicateSessionSets(cookieHeader);
    // Shard-safe: keep sibling indexes of the same session family together
    const keepSet = computeKeepSet(cookieHeader);

    // 1) HEADER BLOAT PURGE
    const purgeTrigger =
      (authBytes > HEADER_BLOAT_BYTES && numSessionIatGroups > 1) ||
      authBytes > 9500;
    if (purgeTrigger && path !== "/clear-session" && !path.startsWith("/api/")) {
      const namesToPurge: string[] = [];
      for (const fam of PURGE_FAMILIES) {
        namesToPurge.push(fam);
        for (let k = 0; k < 20; k++) namesToPurge.push(fam + "." + k);
      }
      const allPresent = collectCookieNames(cookieHeader);
      for (const n of allPresent) if (inFamily(n, PURGE_FAMILIES)) namesToPurge.push(n);
      const dest = new URL(req.nextUrl);
      dest.searchParams.set("p", "1");
      const r = NextResponse.redirect(dest.toString(), 302);
      purgeSetCookie(r, dedupe(namesToPurge), host, secure, keepSet);
      return r;
    }

    // 2) REFERRAL TRACKING
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

    // 3) SESSION / ROLE
    const hasSessionCookie = keepSet.size > 0;
    let role: "ADMIN" | "MODERATOR" | "USER" | null = null;
    if (hasSessionCookie) {
      const latest = latestKeepableCookie(cookieHeader);
      if (latest) {
        const val = readCookieValue(cookieHeader, latest.name);
        if (val.length >= 20) {
          try {
            const a = val.indexOf(".");
            const b = val.indexOf(".", a + 1);
            let p = val.substring(a + 1, b);
            p = p.replace(/-/g, "+").replace(/_/g, "/");
            const pad = (4 - (p.length % 4)) % 4;
            if (pad) p += "====".substring(0, pad);
            // @ts-ignore
            const payload = JSON.parse(atob(p));
            const r = String(payload?.r ?? payload?.role ?? payload?.userRole ?? (payload as any)?.data?.user?.role ?? (payload as any)?.user?.role ?? "");
            if (r === "ADMIN" || r === "MODERATOR" || r === "USER") role = r;
            else role = "USER";
          } catch {
            role = "USER";
          }
        } else {
          role = "USER";
        }
      } else {
        role = null;
      }
    }
    const isLoggedIn = role !== null;

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

    // 4) LIGHTWEIGHT ORPHAN CLEANUP: only fires when we have MULTIPLE sessions (>1 distinct iat).
    //    A single, cleanly-sharded session (all shards same iat) will pass through untouched.
    if (numSessionIatGroups >= 2) {
      const namesToPurge: string[] = [];
      for (const fam of PURGE_FAMILIES) {
        namesToPurge.push(fam);
        for (let k = 0; k < 20; k++) namesToPurge.push(fam + "." + k);
      }
      const r = NextResponse.next();
      purgeSetCookie(r, dedupe(namesToPurge), host, secure, keepSet);
      return r;
    }

    return NextResponse.next();
  } catch {
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
