"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle, Loader2 } from "lucide-react";

export default function ClearSessionPage() {
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    try {
      const host = location.hostname || "";
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
            name.startsWith("whatdo_")
          )
            cookieNames.add(name);
        });
      } catch {}
      const prefixes = [
        "authjs.session-token",
        "authjs.csrf-token",
        "__Secure-authjs.session-token",
        "__Secure-authjs.csrf-token",
        "next-auth.session-token",
        "next-auth.csrf-token",
        "__Secure-next-auth.session-token",
        "__Secure-next-auth.csrf-token",
        "whatdo_sess",
        "whatdo_ref",
      ];
      for (let k = 0; k < 12; k++) {
        prefixes.push("authjs.session-token." + k);
        prefixes.push("__Secure-authjs.session-token." + k);
        prefixes.push("next-auth.session-token." + k);
        prefixes.push("__Secure-next-auth.session-token." + k);
        prefixes.push("authjs.csrf-token." + k);
      }
      prefixes.forEach((p) => cookieNames.add(p));
      const paths = ["/"];
      cookieNames.forEach((cn) => {
        paths.forEach((ph) => {
          // no domain
          document.cookie = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${ph}`;
          document.cookie = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${ph}; secure`;
          document.cookie = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${ph}; SameSite=Lax`;
          document.cookie = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${ph}; secure; SameSite=Lax`;
          document.cookie = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${ph}; SameSite=Strict`;
          document.cookie = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${ph}; secure; SameSite=Strict`;
          candidateDomains.forEach((d) => {
            document.cookie = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${ph}; domain=${d}`;
            document.cookie = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${ph}; secure; domain=${d}`;
            document.cookie = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${ph}; SameSite=Lax; domain=${d}`;
            document.cookie = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${ph}; secure; SameSite=Lax; domain=${d}`;
            document.cookie = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${ph}; SameSite=Strict; domain=${d}`;
            document.cookie = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${ph}; secure; SameSite=Strict; domain=${d}`;
          });
        });
      });
    } catch {}
    const t = setTimeout(() => {
      setDone(true);
      setTimeout(() => {
        window.location.replace("/login");
      }, 500);
    }, 450);
    return () => clearTimeout(t);
  }, []);
  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-slate-950 text-white px-5">
      <div className="text-center space-y-5 max-w-md">
        <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-fuchsia-500/25 via-violet-500/25 to-indigo-500/25 border border-white/10 flex items-center justify-center">
          {done ? <CheckCircle className="h-10 w-10 text-emerald-300" /> : <Loader2 className="h-9 w-9 text-fuchsia-300 animate-spin" />}
        </div>
        <h1 className="text-2xl font-black tracking-tight">
          {done ? "Session reset complete ✓" : "Fixing your login session…"}
        </h1>
        <p className="text-sm text-white/70">
          {done
            ? "We've cleared any stale session cookies that might have broken login. Taking you back to the login page now."
            : "If you saw 'This page couldn't load — 494 REQUEST_HEADER_TOO_LARGE', we're resetting all old session cookies to free up space for WhatDo to work again."}
        </p>
        {!done && (
          <div className="h-1.5 w-48 mx-auto bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-2/3 animate-pulse bg-gradient-to-r from-fuchsia-400 via-violet-400 to-indigo-400 rounded-full" />
          </div>
        )}
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/45 font-bold pt-3">
          {done ? "Redirecting →" : "One moment…"}
        </p>
        <p className="pt-6 text-xs text-white/55">
          {done ? "Not redirecting? " : "Stuck? "}
          <Link href="/login" className="underline decoration-white/40 font-bold text-white/80 hover:text-white">
            Go to login manually
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
