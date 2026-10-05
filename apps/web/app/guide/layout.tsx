import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Safety Guide & Manual — How BinRo Protects You from QR Scams",
  description:
    "Learn how QR code phishing (quishing) works and how to use BinRo to inspect hidden links, verify UPI payment recipients, and check community trust signals before opening.",
  path: "/guide",
});

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
