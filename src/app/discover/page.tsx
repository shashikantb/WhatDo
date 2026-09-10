import { DiscoverPageClient } from "./DiscoverPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover | WHATDO — Explore Categories",
  description:
    "Browse categories, find trending questions, and discover new opinions. Technology, AI, Business, Fashion, and more on WHATDO.",
  openGraph: {
    title: "Discover | WHATDO — Explore Categories",
    description:
      "Browse categories, find trending questions, and discover new opinions. Technology, AI, Business, Fashion, and more on WHATDO.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover | WHATDO — Explore Categories",
    description:
      "Browse categories, find trending questions, and discover new opinions. Technology, AI, Business, Fashion, and more on WHATDO.",
  },
};

export default function DiscoverPage() {
  return <DiscoverPageClient />;
}
