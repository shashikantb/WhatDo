import { TrendingPageClient } from "./TrendingPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trending | WHATDO — What's Hot Right Now",
  description:
    "See the most talked-about questions on WHATDO. Trending opinions across Technology, Business, AI, and more.",
  openGraph: {
    title: "Trending | WHATDO — What's Hot Right Now",
    description:
      "See the most talked-about questions on WHATDO. Trending opinions across Technology, Business, AI, and more.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trending | WHATDO — What's Hot Right Now",
    description:
      "See the most talked-about questions on WHATDO. Trending opinions across Technology, Business, AI, and more.",
  },
};

export default function TrendingPage() {
  return <TrendingPageClient />;
}
