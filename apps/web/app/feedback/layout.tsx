import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Send Feedback & Report Issues",
  description:
    "Share feedback, report false positives, or suggest improvements to help the BinRo team make QR code scanning safer for everyone.",
  path: "/feedback",
});

export default function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
