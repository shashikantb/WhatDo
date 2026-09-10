import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { SessionProviderWrapper } from "@/components/shared/SessionProviderWrapper";
import { ToastProvider } from "@/components/design-system/Toaster";
import TRPCProvider from "@/lib/trpc/Provider";
import { LoginModalProvider } from "@/components/auth/LoginModal";
import { CookieConsent } from "@/components/shared/CookieConsent";
import { PageViewTracker } from "@/components/shared/PageViewTracker";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
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
  appleWebKit: {
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
        <TRPCProvider>
          <ThemeProvider>
            <SessionProviderWrapper>
              <ToastProvider>
                <LoginModalProvider>
                  {children}
                  <CookieConsent />
                  <PageViewTracker />
                </LoginModalProvider>
              </ToastProvider>
            </SessionProviderWrapper>
          </ThemeProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
