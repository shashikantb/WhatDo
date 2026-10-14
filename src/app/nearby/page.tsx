import { NearbyPageClient } from "./NearbyPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nearby | WHATDO — Posts Around You",
  description:
    "See what people are saying near you. Discover local polls, opinions, and community posts in your area on WHATDO.",
  openGraph: {
    title: "Nearby | WHATDO — Posts Around You",
    description:
      "See what people are saying near you. Discover local polls, opinions, and community posts in your area on WHATDO.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nearby | WHATDO — Posts Around You",
    description:
      "See what people are saying near you. Discover local polls, opinions, and community posts in your area on WHATDO.",
  },
};

export default function NearbyPage() {
  return <NearbyPageClient />;
}
