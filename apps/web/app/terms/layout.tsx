import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service — BinRo QR Safety Platform",
  description:
    "Review the Terms of Service for using BinRo's QR code scanner, link safety checker, and community trust reporting features across Web, Android, and iOS.",
  path: "/terms",
});

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
