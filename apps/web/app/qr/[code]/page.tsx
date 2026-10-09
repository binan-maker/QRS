/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO WEB: QR DETAILS PAGE ROUTE
 * ───────────────────────────────────────────────────────────────────────────────
 * Server-rendered QR details view matching the mobile QR Details screen.
 * Decodes short share codes or full hex hashes, loads real Supabase records,
 * trust scores, community votes, and comments.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicQrRecord, getQrIdForContent, type PublicQrRecord } from "../../../lib/qr-data";
import { decodeQrShareCode } from "../../../lib/qr-share";
import { isPaymentQr } from "@services/analysis";
import QrVerificationView from "./QrVerificationView";

export const dynamic = "force-dynamic";

export function resolveQrId(code: string, content?: string): string | null {
  if (code === "custom" && content && content.trim()) {
    return getQrIdForContent(content.trim());
  }
  const decoded = decodeQrShareCode(code);
  if (decoded) return decoded;

  const cleanCode = code.trim().toLowerCase();
  if (/^[0-9a-f]{64}$/.test(cleanCode)) {
    return cleanCode.slice(0, 20);
  }

  // Safe fallback if content was provided in URL query
  if (content && content.trim()) {
    return getQrIdForContent(content.trim());
  }

  return null;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ content?: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const { content } = await searchParams;

  const qrId = resolveQrId(code, content);

  if (!qrId) {
    return {
      title: "QR Details — BinRo",
      description: "Inspect QR code destination, real community trust score, votes, and comments on BinRo.",
    };
  }

  const record = await getPublicQrRecord(qrId, content);

  let targetDisplay = record?.content || content || "QR Code";
  if (targetDisplay.length > 60) {
    targetDisplay = `${targetDisplay.slice(0, 57)}...`;
  }

  const trustScore = record?.trust?.score ?? -1;
  const scoreLabel = trustScore >= 0 ? `${Math.round(trustScore)}% TrustScore` : "Community Checked";
  const contentType = (record?.contentType || "QR").toUpperCase();

  const title = `${contentType}: ${targetDisplay} | BinRo`;
  const description = `Inspect ${targetDisplay} (${scoreLabel}). Real-time community trust ratings, scan statistics, and safety reports on BinRo.`;

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
      card: "summary",
      title,
      description,
    },
  };
}

export default async function QrDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ content?: string }>;
}) {
  const { code } = await params;
  const { content } = await searchParams;

  // 1. Decode share code, raw hex ID, or compute from content fallback
  const qrId = resolveQrId(code, content);
  if (!qrId) notFound();

  // 2. Fetch real record, votes, trust score, and comments from Supabase
  let record = await getPublicQrRecord(qrId, content);

  // 3. Fallback when QR code is brand new (not yet inserted in qr_codes) — never show fake trust score
  if (!record) {
    const rawContent = content?.trim() || "";
    const isPayment = isPaymentQr(rawContent);
    const isPhone = !isPayment && (/^tel:/i.test(rawContent) || /^\+?[\d\s\-().]{7,20}$/.test(rawContent));
    const isEmail = !isPayment && /^mailto:/i.test(rawContent);
    const isSms = !isPayment && /^smsto?:/i.test(rawContent);
    const isUrl =
      !isPayment &&
      !isPhone &&
      !isEmail &&
      !isSms &&
      (/^https?:\/\//i.test(rawContent) ||
        (/^[a-z0-9-]+(\.[a-z0-9-]+)+\/?/i.test(rawContent) && !rawContent.includes(" ")));

    record = {
      id: qrId,
      content: rawContent,
      contentType: isPayment
        ? "payment"
        : isPhone
          ? "phone"
          : isEmail
            ? "email"
            : isSms
              ? "sms"
              : isUrl
                ? "url"
                : "text",
      createdAt: null,
      scanCount: 1,
      commentCount: 0,
      trust: { score: -1, label: "Unrated", totalReports: 0 },
      reportCounts: {},
      weightedCounts: {},
      comments: [],
    };
  }

  return <QrVerificationView record={record} code={code} />;
}

