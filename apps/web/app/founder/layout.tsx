import type { Metadata } from "next";
import { createPageMetadata, buildFounderPageStructuredData } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title:
    "Ahmed Sameer Binan — Founder of BinRo | 20-Year-Old Tech Entrepreneur from Kasaragod, Kerala",
  description:
    "Ahmed Sameer Binan (20 years old, from Kasaragod, Kerala, India) is the Founder and Creator of BinRo — the Truecaller for QR codes ('Know Before You Scan' / 'Pehle BinRo. Phir Scan').",
  path: "/founder",
});

const founderPageJsonLd = JSON.stringify(buildFounderPageStructuredData());

export default function FounderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        id="binro-founder-profile-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: founderPageJsonLd }}
      />
      {children}
    </>
  );
}
