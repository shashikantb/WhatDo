import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  generateEtags: true,
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "media.whatdo.app",
        pathname: "**",
      },
    ],
  },
  transpilePackages: ["lucide-react"],
  async rewrites() {
    return [
      {
        source: "/api/trpc/(.*)",
        destination: "/api/trpc/[trpc]",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "font-src 'self' data: https:",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "frame-src 'self' https://challenges.cloudflare.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/",
              "img-src 'self' data: blob: https: http: cid: mediastream: filesystem:",
              "connect-src 'self' https: wss:",
              "manifest-src 'self'",
              "media-src 'self' blob: data: https:",
              "object-src 'none'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
              "script-src-attr 'none'",
              "style-src 'self' 'unsafe-inline' https:",
              "upgrade-insecure-requests",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
      {
        source: "/_next/static/css/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/icons/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800" },
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
      {
        source: "/robots.txt",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
      {
        source: "/sitemap.xml",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
  sentry: {
    disableServerWebpackPlugin: true,
    disableClientWebpackPlugin: true,
    hideSourceMaps: true,
  },
};

export default withSentryConfig(nextConfig, {
  org: "your-org",
  project: "whatdo",
  silent: true,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
});
