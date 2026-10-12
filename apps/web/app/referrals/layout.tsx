import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Invite Friends & Referral Network | BinRo",
  description:
    "Invite your friends to BinRo. Help your network inspect destination links, check UPI payment safety, and verify QR security before opening.",
  path: "/referrals",
});

export default function ReferralsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
