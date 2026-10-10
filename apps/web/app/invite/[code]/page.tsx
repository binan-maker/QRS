import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: InvitePageProps): Promise<Metadata> {
  const { code } = await params;
  const cleanCode = (code || "").trim().replace(/^@/, "").toLowerCase();

  const title = `Claim Your Silver Welcome Scratch Card — Invited by @${cleanCode} | BinRo`;
  const description = `Join BinRo through @${cleanCode}'s VIP invite. Scan any QR code safely, check community trust scores, and unlock your Silver Welcome Scratch Card!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "BinRo",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const cleanCode = (code || "").trim().replace(/^@/, "").toLowerCase();

  // Instant redirect to registration with referral attribution
  redirect(`/register?ref=${cleanCode}`);
}
