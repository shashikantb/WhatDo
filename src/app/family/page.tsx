import { FamilyPageClient } from "./FamilyPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Family | WHATDO",
  description:
    "Connect with your family, share location, and stay safe with SOS alerts on WHATDO.",
};

export default function FamilyPage() {
  return <FamilyPageClient />;
}
