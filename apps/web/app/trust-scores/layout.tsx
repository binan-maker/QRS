import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "About Trust Scores — How BinRo Evaluates QR Code Safety",
  description:
    "Discover how BinRo combines automated security analysis with real-time community votes and scam reports to calculate a clear 0–100 safety score for every QR code.",
  path: "/trust-scores",
});

export default function TrustScoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
