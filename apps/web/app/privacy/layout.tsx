import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy — Digital Privacy & Data Protection",
  description:
    "Read BinRo's Privacy Policy. Learn how we process camera feeds locally on your device, protect your scan history, and uphold zero-data-selling privacy standards.",
  path: "/privacy",
});

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
