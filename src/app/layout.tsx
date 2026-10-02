import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/shared/AppProviders";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

function buildMetadataBase(): URL {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "";
  if (!raw) return new URL("https://whatdo.app");
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw);
    return new URL(`https://${raw}`);
  } catch {
    return new URL("https://whatdo.app");
  }
}

const APP_URL = buildMetadataBase().toString();

export const metadata: Metadata = {
  metadataBase: buildMetadataBase(),
  title: {
    default: "WHATDO — See it. Vote it. Know what people think.",
    template: "%s | WHATDO",
  },
  description:
    "Scroll through questions, images, videos and ideas — tell the world what you think in one tap.",
  keywords: ["whatdo", "polls", "voting", "social", "community", "opinions", "surveys", "trending"],
  authors: [{ name: "WHATDO" }],
  creator: "WHATDO",
  publisher: "WHATDO",
  category: "social",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [
      { url: "/icons/icon-192.svg" },
    ],
    shortcut: ["/favicon.svg"],
  },
  appleWebApp: {
    title: "WHATDO",
    statusBarStyle: "black-translucent",
    startupImage: [],
    capable: true,
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "WHATDO",
    title: "WHATDO — See it. Vote it. Know what people think.",
    description:
      "Scroll through questions, images, videos and ideas — tell the world what you think in one tap.",
    images: [
      {
        url: "/icons/icon-512.svg",
        width: 512,
        height: 512,
        alt: "WHATDO",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@whatdo",
    creator: "@whatdo",
    title: "WHATDO — See it. Vote it. Know what people think.",
    description:
      "Scroll through questions, images, videos and ideas — tell the world what you think in one tap.",
    images: ["/icons/icon-512.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b12" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen bg-background font-sans antialiased scrollbar-thin`}
      >
        <Script id="nuke-session-cookies" strategy="beforeInteractive" dangerouslySetInnerHTML={{
          __html: `(function(){try{
  if(!document) return;
  var host = location.hostname || "";
  var parts = host.split(".");
  var candidateDomains = [];
  if(host) candidateDomains.push(host);
  if (parts.length >= 2) {
    for (var i = 1; i < parts.length - 1; i++) {
      candidateDomains.push(parts.slice(i).join("."));
    }
    candidateDomains.push("." + parts.slice(-2).join("."));
  }
  var cookieNames = [];
  try {
    var cs = document.cookie.split(";") || [];
    for (var i = 0; i < cs.length; i++) {
      var p = cs[i] || "";
      while (p.charAt(0) === " ") p = p.substring(1, p.length);
      var idx = p.indexOf("=");
      var name = idx > -1 ? p.substring(0, idx) : p;
      if (name && (name.indexOf("authjs.") === 0 || name.indexOf("__Secure-authjs.") === 0 || name.indexOf("next-auth.") === 0 || name.indexOf("__Secure-next-auth.") === 0 || name === "whatdo_sess" || name.indexOf("whatdo_") === 0)) {
        cookieNames.push(name);
      }
    }
  } catch(e) {}
  var prefixes = ["authjs.session-token","authjs.csrf-token","__Secure-authjs.session-token","__Secure-authjs.csrf-token","next-auth.session-token","next-auth.csrf-token","__Secure-next-auth.session-token","__Secure-next-auth.csrf-token","whatdo_sess","whatdo_ref"];
  for (var k = 0; k < 12; k++) {
    prefixes.push("authjs.session-token." + k);
    prefixes.push("__Secure-authjs.session-token." + k);
    prefixes.push("next-auth.session-token." + k);
    prefixes.push("__Secure-next-auth.session-token." + k);
    prefixes.push("authjs.csrf-token." + k);
  }
  for (var j = 0; j < prefixes.length; j++) {
    if (cookieNames.indexOf(prefixes[j]) === -1) cookieNames.push(prefixes[j]);
  }
  var paths = ["/"];
  for (var n = 0; n < cookieNames.length; n++) {
    var cn = cookieNames[n];
    var tries = [
      "",
    ];
    for (var t = 0; t < tries.length; t++) {
      for (var pi = 0; pi < paths.length; pi++) {
        var ph = paths[pi];
        // no domain, path=/
        document.cookie = cn + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + ph + tries[t];
        document.cookie = cn + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + ph + "; secure" + tries[t];
        document.cookie = cn + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + ph + "; SameSite=Lax" + tries[t];
        document.cookie = cn + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + ph + "; secure; SameSite=Lax" + tries[t];
        document.cookie = cn + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + ph + "; SameSite=Strict" + tries[t];
        document.cookie = cn + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + ph + "; secure; SameSite=Strict" + tries[t];
        document.cookie = cn + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + ph + "; httpOnly" + tries[t];
        for (var di = 0; di < candidateDomains.length; di++) {
          var d = candidateDomains[di];
          document.cookie = cn + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + ph + "; domain=" + d + tries[t];
          document.cookie = cn + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + ph + "; secure; domain=" + d + tries[t];
          document.cookie = cn + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + ph + "; SameSite=Lax; domain=" + d + tries[t];
          document.cookie = cn + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + ph + "; secure; SameSite=Lax; domain=" + d + tries[t];
          document.cookie = cn + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + ph + "; SameSite=Strict; domain=" + d + tries[t];
          document.cookie = cn + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + ph + "; secure; SameSite=Strict; domain=" + d + tries[t];
        }
      }
    }
  }
  if (sessionStorage && !sessionStorage.getItem("__wd_nuke") && location.search && location.search.indexOf("__wd_nuke_done") === -1) {
    try { sessionStorage.setItem("__wd_nuke", "1"); } catch(e) {}
    try {
      if (location.search.indexOf("__wd_nuke_done") === -1) {
        var s = location.pathname + location.search + (location.search ? "&" : "?") + "__wd_nuke_done=1" + location.hash;
        setTimeout(function(){ location.replace(s); }, 10);
      }
    } catch(e) {}
  }
} catch(e) {}})();`
        }} />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
