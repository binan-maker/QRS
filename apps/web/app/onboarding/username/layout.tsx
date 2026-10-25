import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Onboarding",
  description:
    "Claim your unique BinRo handle to appear on community safety leaderboards and customize your public verified profile.",
  path: "/onboarding/username",
});

export default function OnboardingUsernameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
