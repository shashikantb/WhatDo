import { NextRequest, NextResponse } from "next/server";

// Server-side cookie purge. Responds to:
// GET /api/auth/clear-session  (public, no auth needed)
// This lets us drop ALL next-auth/auth.js/whatdo session cookies from inside
// the same origin, even when httpOnly=true. Use it for 494 REQUEST_HEADER_TOO_LARGE.
const CLEAR_FAMILIES = [
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
  "__wd_nuke",
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const host = (req.headers.get("x-forwarded-host") || req.nextUrl.hostname || "").trim();
    const proto = req.headers.get("x-forwarded-proto");
    const secure = proto ? proto === "https" : process.env.NODE_ENV === "production";

    const candidateDomains: string[] = [];
    if (host) candidateDomains.push(host);
    // NOTE: deliberately skip .co.in / public suffix wildcards.

    const allNames: string[] = [];
    for (const base of CLEAR_FAMILIES) {
      allNames.push(base);
      for (let k = 0; k < 25; k++) allNames.push(`${base}.${k}`);
    }

    const search = req.nextUrl.searchParams;
    const redirect = search.get("redirect");
    const redirectTo = redirect && /^\/[A-Za-z0-9_\-?=&./#]*$/.test(redirect)
      ? redirect
      : "/clear-session?done=1";

    const res = NextResponse.redirect(new URL(redirectTo, req.nextUrl).toString(), 302);

    const paths = ["/"];
    for (const name of allNames) {
      for (const path of paths) {
        const expires = new Date(0);
        const maxAge = 0;
        const attempts: Array<[boolean, boolean, "lax" | "strict" | "none", string | undefined]> = [
          [true, secure, "lax", undefined],
          [true, secure, "strict", undefined],
          [false, secure, "lax", undefined],
          [false, secure, "strict", undefined],
        ];
        if (secure) attempts.push([true, true, "none", undefined]);
        for (const d of candidateDomains) {
          attempts.push([true, secure, "lax", d]);
          attempts.push([false, secure, "lax", d]);
          if (secure) attempts.push([true, true, "none", d]);
        }
        for (const [httpOnly, sec, sameSiteActual, domain] of attempts) {
          try {
            const opts: any = { path, expires, maxAge, httpOnly, sameSite: sameSiteActual, secure: sec };
            if (domain) opts.domain = domain;
            res.cookies.set(name, "", opts);
          } catch {}
        }
      }
    }
    try {
      res.headers.set("Clear-Site-Data", '"cookies", "storage"');
    } catch {}
    return res;
  } catch {
    // Even on unexpected error, redirect the user so the browser isn't stuck.
    try {
      const r = req.nextUrl.clone();
      r.searchParams.set("c", "1");
      r.pathname = "/clear-session";
      return NextResponse.redirect(r.toString(), 302);
    } catch {
      return new Response("", { status: 302, headers: { Location: "/clear-session?done=1" } });
    }
  }
}
