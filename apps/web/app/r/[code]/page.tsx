import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface ShortLinkPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: ShortLinkPageProps): Promise<Metadata> {
  const { code } = await params;
  const cleanCode = (code || "").trim().replace(/^@/, "").toLowerCase();

  return {
    title: `VIP Invite from @${cleanCode} | BinRo`,
    description: `Claim your Silver Welcome Scratch Card from @${cleanCode} on BinRo. Inspect QR codes safely before opening or paying.`,
  };
}

export default async function ShortLinkPage({ params }: ShortLinkPageProps) {
  const { code } = await params;
  const cleanCode = (code || "").trim().replace(/^@/, "").toLowerCase();

  // Redirect to full rich invite experience
  redirect(`/invite/${cleanCode}`);
}
