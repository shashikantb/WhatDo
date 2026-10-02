import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const d = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return formatDate(date);
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Aggressive client-side purge of ALL NextAuth/WhatDo session cookies.
 * Runs:
 *   - beforeInteractive on every page paint (layout.tsx)
 *   - after successful login / register / revealAfter merge
 * This deletes every permutation we've ever used across all prior AUTH_SECRET
 * rotations so browsers never accumulate 5+ × 4KB cookies (which causes Vercel
 * nginx to return a hard 494 REQUEST_HEADER_TOO_LARGE *before* Next.js runs).
 *
 * Cookie deletion requires exact match of path/domain/sameSite/secure flags the
 * cookie was originally set with — so we try every combination against host,
 * parent subdomains, and the apex ".whatdo.co.in" / ".whatdo.app".
 */
export function purgeStaleAuthCookies(): number {
  if (typeof document === "undefined") return 0;
  const host = typeof location !== "undefined" ? location.hostname || "" : "";
  const parts = host.split(".");
  const candidateDomains: string[] = [];
  if (host) candidateDomains.push(host);
  if (parts.length >= 2) {
    for (let i = 1; i < parts.length - 1; i++) candidateDomains.push(parts.slice(i).join("."));
    candidateDomains.push("." + parts.slice(-2).join("."));
  }
  const seenNames = new Set<string>();
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
        seenNames.add(name);
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
    "__Secure-next-auth.session-token",
    "__Secure-next-auth.csrf-token",
    "__Secure-next-auth.callback-url",
    "whatdo_sess",
    "whatdo_ref",
  ];
  for (let k = 0; k < 20; k++) {
    prefixes.push("authjs.session-token." + k);
    prefixes.push("__Secure-authjs.session-token." + k);
    prefixes.push("next-auth.session-token." + k);
    prefixes.push("__Secure-next-auth.session-token." + k);
    prefixes.push("authjs.csrf-token." + k);
    prefixes.push("next-auth.csrf-token." + k);
  }
  prefixes.forEach((p) => seenNames.add(p));
  const paths = ["/"];
  let deleted = 0;
  seenNames.forEach((cn) => {
    paths.forEach((ph) => {
      // no domain, various flag combos
      const variants = [
        `path=${ph}`,
        `path=${ph}; secure`,
        `path=${ph}; SameSite=Lax`,
        `path=${ph}; secure; SameSite=Lax`,
        `path=${ph}; SameSite=Strict`,
        `path=${ph}; secure; SameSite=Strict`,
        `path=${ph}; httpOnly`,
      ];
      variants.forEach((suffix) => {
        document.cookie = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${suffix}`;
        deleted++;
      });
      candidateDomains.forEach((d) => {
        const domainVariants = [
          `path=${ph}; domain=${d}`,
          `path=${ph}; secure; domain=${d}`,
          `path=${ph}; SameSite=Lax; domain=${d}`,
          `path=${ph}; secure; SameSite=Lax; domain=${d}`,
          `path=${ph}; SameSite=Strict; domain=${d}`,
          `path=${ph}; secure; SameSite=Strict; domain=${d}`,
          `path=${ph}; httpOnly; domain=${d}`,
        ];
        domainVariants.forEach((suffix) => {
          document.cookie = `${cn}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${suffix}`;
          deleted++;
        });
      });
    });
  });
  try {
    sessionStorage.removeItem("__wd_nuke");
    localStorage.removeItem("nextauth.message");
  } catch {}
  return deleted;
}
