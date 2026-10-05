import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Create Account",
  description:
    "Create a free BinRo account to report scam QR codes, vote on link safety, and protect your community from QR phishing.",
  path: "/register",
});

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
