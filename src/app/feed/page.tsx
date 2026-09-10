import { FeedPageClient } from "./FeedPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed | WHATDO — See it. Vote it.",
  description:
    "Discover what people really think. Browse personalized opinions, trending questions, and follow creators you love.",
  openGraph: {
    title: "Feed | WHATDO — See it. Vote it.",
    description:
      "Discover what people really think. Browse personalized opinions, trending questions, and follow creators you love.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Feed | WHATDO — See it. Vote it.",
    description:
      "Discover what people really think. Browse personalized opinions, trending questions, and follow creators you love.",
  },
};

export default function FeedPage() {
  return <FeedPageClient />;
}
