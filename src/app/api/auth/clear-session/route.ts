import { NextRequest, NextResponse } from "next/server";

// Server-side cookie purge. Responds to:
//   GET /api/auth/clear-session
//   GET /api/auth/clear-session?redirect=/login    (relative redirect only)
//
// Strategy:
//   1. Clear-Site-Data: "cookies", "storage"  — PRIMARY, reliable.
//      Wipes EVERY cookie / storage bucket scoped to this origin, regardless
//      of name/path/domain/SameSite. Supported in all modern browsers.
//   2. Per-family expires=1970 Set-Cookie writes  — FALLBACK.
//      Only for old Safari (<13) / embedded webviews that ignore
//      Clear-Site-Data. Only the base cookie family names, no shard suffixes
//      — siblings are covered by Clear-Site-Data for modern browsers and by
//      src/middleware.ts (force-nuke >6 shard families on every request) for
//      the rest. Keeping the Set-Cookie count tiny (21) avoids blowing past
//      Vercel's undocumented low header-count limit (the exact symptom that
//      caused a prod-only 500 while localhost worked).
//
// EVERYTHING runs inside one outer try/catch. Redirects use positional 302
// (the Next.js 14 form that works reliably across runtimes) and a final
// plain-Response fallback so the user never sees a blank 500.

const BASE_FAMILIES: readonly string[] = [
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
    // --- 1. Resolve redirect target -------------------------------------------------
    const target: string = (() => {
      try {
        const raw = req.nextUrl.searchParams.get("redirect");
        if (raw && /^\/[A-Za-z0-9_\-?=&./#%]*$/.test(raw)) return raw;
      } catch {
        // ignore — malformed URL from edge, fall through to default
      }
      return "/clear-session?done=1";
    })();

    // --- 2. Build the redirect response ---------------------------------------------
    //    Positional (url, 302) form is the only Next.js 14 redirect signature that
    //    works reliably across node / edge / middleware runtimes; object form crashes.
    let res: NextResponse;
    try {
      res = NextResponse.redirect(new URL(target, req.nextUrl).toString(), 302);
    } catch {
      return new Response("", {
        status: 302,
        headers: {
          Location: target,
          "Clear-Site-Data": '"cookies", "storage"',
        },
      });
    }

    // --- 3. Secure flag --------------------------------------------------------------
    const fwdProto =
      ((req.headers.get("x-forwarded-proto") ?? "").split(",")[0] || "").trim().toLowerCase();
    const secure: boolean =
      fwdProto === "https" ||
      (() => {
        try {
          return req.nextUrl.protocol === "https:";
        } catch {
          return false;
        }
      })() ||
      process.env.NODE_ENV === "production";

    // --- 4. Per-family 1970-expiry writes (fallback only) ---------------------------
    //    Exactly 1 write per base family name. No permutations. No shard loops.
    //    This produces ~21 Set-Cookie headers (~3KB total) on every call.
    for (const name of BASE_FAMILIES) {
      try {
        res.cookies.set(name, "", {
          path: "/",
          expires: new Date(0),
          maxAge: 0,
          httpOnly: true,
          sameSite: "lax",
          secure,
        });
      } catch {
        // one bad cookie name / runtime option mismatch — skip, keep going.
      }
    }

    // --- 5. Clear-Site-Data: the real cleanup. ---------------------------------------
    try {
      res.headers.set("Clear-Site-Data", '"cookies", "storage"');
    } catch {
      // ignore — Set-Cookie fallbacks above still cover old webviews
    }

    return res;
  } catch {
    // Final last-ditch: something very unexpected (URL parsing, header
    // immutability, cookies object throw). Respond with a plain Node Response
    // — no NextResponse APIs at all.
    try {
      return new Response("", {
        status: 302,
        headers: {
          Location: "/clear-session?done=1",
          "Clear-Site-Data": '"cookies", "storage"',
        },
      });
    } catch {
      return new Response("", { status: 302, headers: { Location: "/clear-session?done=1" } });
    }
  }
}
