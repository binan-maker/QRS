import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Refer & Earn — Give Silver, Get Gold VIP Scratch Cards",
  description:
    "Invite your friends to BinRo. Friends get a Silver Welcome Scratch Card upon joining, and you earn Gold VIP Scratch Cards when they complete their first verified QR scan.",
  path: "/referrals",
});

export default function ReferralsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
