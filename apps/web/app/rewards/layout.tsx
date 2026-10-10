import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Scratch Cards — Unlock & Scratch Exclusive Deals",
  description:
    "Scan QR codes, complete daily scan milestones, and scratch cards to reveal exclusive merchant coupons from top brands like boAt, AJIO, and Swiggy on BinRo.",
  path: "/rewards",
});

export default function RewardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
