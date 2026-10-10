import { NextRequest, NextResponse } from "next/server";

// Server-side cookie purge. Responds to:
//   GET /api/auth/clear-session
//   GET /api/auth/clear-session?redirect=/login    (relative redirect only)
//
// Strategy — two-layer cleanup:
//   1. Clear-Site-Data: "cookies", "storage"
//      Wipes EVERY cookie / storage bucket scoped to this origin, regardless
//      of name/path/domain/SameSite. Supported in all modern browsers. This is
//      the primary, reliable mechanism.
//   2. Individual Set-Cookie: expires=1970 writes
//      Fallback for pre-2020 browsers / embedded webviews that ignore
//      Clear-Site-Data. Only host-scoped SameSite=Lax (the common authjs
//      default) — writing every attribute combination (domain scoped,
//      SameSite=None, Strict, non-HttpOnly etc.) produces thousands of
//      Set-Cookie headers and blows past Vercel's ~64KB response-header
//      limit, surfacing a 500 on prod while working locally (the exact bug
//      this rewrite fixes).
//
// Fail-safe: any exception falls back to a plain Response redirect so the
// user never stares at a blank 500 page.

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

// Middleware force-nuke triggers at keepSet.size > 6 shards and deletes the
// whole family. 0..5 is therefore the maximum number of shards any valid
// authjs session cookie family can ever have when a user reaches this
// endpoint through normal navigation. Raising this higher produces
// unnecessary Set-Cookie headers that push the response past Vercel's
// ~64KB response-header size limit on production.
const MAX_SHARD = 5;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectTarget(req: NextRequest): string {
  const raw = req.nextUrl.searchParams.get("redirect");
  if (raw && /^\/[A-Za-z0-9_\-?=&./#%]*$/.test(raw)) return raw;
  return "/clear-session?done=1";
}

function cookieNames(): string[] {
  const out: string[] = [];
  for (const base of BASE_FAMILIES) {
    out.push(base);
    for (let i = 0; i <= MAX_SHARD; i++) out.push(`${base}.${i}`);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const target = redirectTarget(req);

  const fwdProto = (req.headers.get("x-forwarded-proto") ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  const secure: boolean =
    fwdProto === "https" ||
    req.nextUrl.protocol === "https:" ||
    process.env.NODE_ENV === "production";

  let res: NextResponse;
  try {
    // Positional redirect arg. Next.js 14 edge/node crossover paths had bugs
    // with the object-form `{status: 302}` init; positional is safe.
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

  const allNames = cookieNames();
  for (const name of allNames) {
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
      // reserved name / bad options — skip one cookie, keep going
    }
  }

  try {
    res.headers.set("Clear-Site-Data", '"cookies", "storage"');
  } catch {
    // ignore
  }

  return res;
}
