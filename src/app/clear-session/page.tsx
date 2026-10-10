"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle, Loader2, AlertTriangle, ArrowRight } from "lucide-react";

export default function ClearSessionPage() {
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const doneParam = search?.get("done") === "1";
  const [stage, setStage] = React.useState<"clearing" | "done" | "server">(doneParam ? "server" : "clearing");
  const [redirectSoon, setRedirectSoon] = React.useState(false);

  React.useEffect(() => {
    // Stage 1: client-side cookie wipe (for non-httpOnly cookies and same-domain variants)
    const host = (typeof location !== "undefined" ? location.hostname : "") || "";
    const parts = host.split(".");
    const candidateDomains: string[] = [];
    if (host) candidateDomains.push(host);
    if (parts.length >= 2) {
      for (let i = 1; i < parts.length - 1; i++) candidateDomains.push(parts.slice(i).join("."));
      candidateDomains.push("." + parts.slice(-2).join("."));
    }
    const cookieNames = new Set<string>();
    try {
      document.cookie.split(";").forEach((raw) => {
        const p = raw.trim();
        const idx = p.indexOf("=");
        const name = idx > -1 ? p.substring(0, idx) : p;
        if (!name) return;
        if (
          name.startsWith("authjs.") ||
          name.startsWith("__Secure-authjs.") ||
          name.startsWith("next-auth.") ||
          name.startsWith("__Secure-next-auth.") ||
          name === "whatdo_sess" ||
          name === "whatdo_ref" ||
          name.startsWith("whatdo_") ||
          name === "__wd_nuke"
        )
          cookieNames.add(name);
      });
    } catch {}
    const prefixes = [
      "authjs.session-token",
      "authjs.csrf-token",
      "authjs.callback-url",
      "authjs.state",
      "authjs.pkce.code_verifier",
      "__Secure-authjs.session-token",
      "__Secure-authjs.csrf-token",
      "__Secure-authjs.callback-url",
      "__Secure-authjs.state",
      "__Secure-authjs.pkce.code_verifier",
      "next-auth.session-token",
      "next-auth.csrf-token",
      "next-auth.callback-url",
      "next-auth.state",
      "next-auth.pkce.code_verifier",
      "__Secure-next-auth.session-token",
      "__Secure-next-auth.csrf-token",
      "__Secure-next-auth.callback-url",
      "__Secure-next-auth.state",
      "whatdo_sess",
      "whatdo_ref",
      "__wd_nuke",
    ];
    for (let k = 0; k < 25; k++) {
      prefixes.forEach((base) => prefixes.push(base + "." + k));
    }
    prefixes.forEach((p) => cookieNames.add(p));
    const paths = ["/"];
    cookieNames.forEach((cn) => {
      paths.forEach((ph) => {
        const base = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${ph}`;
        const variants = [
          base,
          `${base}; secure`,
          `${base}; SameSite=Lax`,
          `${base}; secure; SameSite=Lax`,
          `${base}; SameSite=Strict`,
          `${base}; secure; SameSite=Strict`,
        ];
        variants.forEach((v) => {
          try { document.cookie = v; } catch {}
        });
        candidateDomains.forEach((d) => {
          const dom = `; domain=${d}`;
          variants.forEach((v) => {
            try { document.cookie = v + dom; } catch {}
          });
        });
      });
    });
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}

    if (doneParam) {
      setStage("server");
      setTimeout(() => setRedirectSoon(true), 500);
      setTimeout(() => { window.location.replace("/whatdo"); }, 1500);
      return;
    }

    // Stage 2: redirect through server-side API endpoint to ALSO purge httpOnly session cookies
    const t = setTimeout(() => {
      setStage("done");
      const redir = "/api/auth/clear-session?redirect=%2Fclear-session%3Fdone%3D1";
      setTimeout(() => {
        window.location.replace(redir);
      }, 400);
    }, 650);
    return () => clearTimeout(t);
  }, [doneParam]);

  const title =
    stage === "server"
      ? "All session cookies cleared ✓"
      : stage === "done"
      ? "Client-side cleared — finalising server-side…"
      : "Fixing your login session…";

  const body =
    stage === "server"
      ? "That annoying '494 Request Header Too Large' jam is gone. Taking you straight to WhatDo so you can log in fresh."
      : stage === "done"
      ? "We've wiped stale session cookies on your browser. Now asking the server to drop HTTP-only login cookies too — one moment."
      : "Your browser sent too many old session cookies (leftover from testing multiple accounts). We're clearing all old auth cookies so Cloudflare won't block the request with 494 REQUEST_HEADER_TOO_LARGE.";

  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-slate-950 text-white px-5">
      <div className="text-center space-y-6 max-w-lg">
        <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-fuchsia-500/25 via-violet-500/25 to-indigo-500/25 border border-white/10 flex items-center justify-center">
          {stage === "server" ? (
            <CheckCircle className="h-10 w-10 text-emerald-300" />
          ) : stage === "done" ? (
            <CheckCircle className="h-9 w-9 text-violet-300" />
          ) : (
            <Loader2 className="h-9 w-9 text-fuchsia-300 animate-spin" />
          )}
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-400/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200">
          <AlertTriangle className="h-3 w-3" />
          If you saw <span className="font-mono">494 REQUEST_HEADER_TOO_LARGE</span>, this fixes it.
        </div>

        <h1 className="text-3xl font-black tracking-tight leading-tight">
          {title}
        </h1>
        <p className="text-[15px] leading-relaxed text-white/75">
          {body}
        </p>

        {stage !== "server" && (
          <div className="h-1.5 w-64 mx-auto bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-2/3 animate-pulse bg-gradient-to-r from-fuchsia-400 via-violet-400 to-indigo-400 rounded-full" />
          </div>
        )}

        {stage === "server" && (
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/whatdo"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-5 py-3 text-sm font-black text-white shadow-lg hover:brightness-110 transition"
            >
              {redirectSoon ? "Taking you to WhatDo…" : "Take me to WhatDo now"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="text-xs font-bold text-white/70 underline decoration-white/30 hover:text-white"
            >
              Or go straight to login
            </Link>
          </div>
        )}

        {stage !== "server" && (
          <p className="pt-4 text-xs text-white/50">
            Taking longer than expected?{" "}
            <Link href="/api/auth/clear-session?redirect=%2Fwhatdo" className="underline decoration-white/40 font-bold text-white/85 hover:text-white">
              Force server-side session reset →
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
