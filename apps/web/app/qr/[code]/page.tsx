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
import QrVerificationView from "./QrVerificationView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "QR Details — BinRo",
  description: "View QR code destination, real community trust score, votes, and comments on BinRo.",
};

export default async function QrDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ content?: string }>;
}) {
  const { code } = await params;
  const { content } = await searchParams;

  // 1. Decode share code or raw hex ID (or compute from content if custom)
  const qrId =
    code === "custom" && content
      ? getQrIdForContent(content)
      : decodeQrShareCode(code);
  if (!qrId) notFound();

  // 2. Fetch real record, votes, trust score, and comments from Supabase
  let record = await getPublicQrRecord(qrId, content);

  // 3. Fallback when QR code is brand new (not yet inserted in qr_codes) — never show fake trust score
  if (!record) {
    const rawContent = content?.trim() || "";
    const isUrl =
      /^https?:\/\//i.test(rawContent) ||
      (/^[a-z0-9-]+(\.[a-z0-9-]+)+\/?/i.test(rawContent) && !rawContent.includes(" "));

    record = {
      id: qrId,
      content: rawContent,
      contentType: isUrl ? "url" : "text",
      createdAt: null,
      scanCount: 1,
      commentCount: 0,
      displayDestination: rawContent || null,
      trust: { score: -1, label: "Unrated", totalReports: 0 },
      reportCounts: {},
      weightedCounts: {},
      comments: [],
    };
  }

  return <QrVerificationView record={record} code={code} />;
}

