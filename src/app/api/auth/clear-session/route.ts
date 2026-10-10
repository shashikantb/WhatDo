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
  const host = (req.headers.get("x-forwarded-host") || req.nextUrl.hostname || "").trim();
  const proto = req.headers.get("x-forwarded-proto");
  const secure = proto ? proto === "https" : process.env.NODE_ENV === "production";

  const candidateDomains: string[] = [];
  if (host) candidateDomains.push(host);
  const parts = host.split(".");
  if (parts.length >= 2) candidateDomains.push("." + parts.slice(-2).join("."));

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

  const res = NextResponse.redirect(new URL(redirectTo, req.nextUrl).toString(), {
    status: 302,
  });

  const allPaths = ["/"];
  for (const name of allNames) {
    for (const path of allPaths) {
      const common = {
        name,
        value: "",
        path,
        expires: new Date(0),
        maxAge: 0,
      };
      // httpOnly + lax
      try { res.cookies.set({ ...common, httpOnly: true, sameSite: "lax", secure }); } catch {}
      try { res.cookies.set({ ...common, httpOnly: true, sameSite: "strict", secure }); } catch {}
      try { res.cookies.set({ ...common, httpOnly: true, sameSite: "none", secure: true }); } catch {}
      // non-httpOnly (covers JS-set whatdo_sess, etc.)
      try { res.cookies.set({ ...common, sameSite: "lax", secure }); } catch {}
      try { res.cookies.set({ ...common, sameSite: "strict", secure }); } catch {}
      for (const d of candidateDomains) {
        try { res.cookies.set({ ...common, httpOnly: true, sameSite: "lax", secure, domain: d } as any); } catch {}
        try { res.cookies.set({ ...common, sameSite: "lax", secure, domain: d } as any); } catch {}
        try { res.cookies.set({ ...common, httpOnly: true, sameSite: "none", secure: true, domain: d } as any); } catch {}
      }
    }
  }

  // Bonus: also set Clear-Site-Data header to nudge the browser.
  try {
    res.headers.set("Clear-Site-Data", '"cookies", "storage"');
  } catch {}

  return res;
}
