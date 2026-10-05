import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Sign In",
  description:
    "Sign in to your BinRo account to sync your QR scan history, vote on QR trust scores, and contribute community safety warnings.",
  path: "/login",
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
