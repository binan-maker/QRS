import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Download BinRo App — Safe QR Code Scanner for Android & iOS",
  description:
    "Download the official BinRo mobile app for Android and iOS. Protect yourself from fake QR stickers, phishing links, and payment scams with instant pre-scan verification.",
  path: "/download",
});

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
