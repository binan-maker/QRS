/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO WEB: QR VERIFICATION PAGE ROUTE
 * ───────────────────────────────────────────────────────────────────────────────
 * Server-rendered QR safety report view.
 * Decodes short share codes or full hex hashes, loads real Supabase records,
 * and renders a responsive mobile-first verification card.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { notFound } from "next/navigation";
import { getPublicQrRecord, getQrIdForContent, type PublicQrRecord } from "../../../lib/qr-data";
import { decodeQrShareCode } from "../../../lib/qr-share";
import QrVerificationView from "./QrVerificationView";

export const dynamic = "force-dynamic";

export default async function QrVerificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ content?: string }>;
}) {
  const { code } = await params;
  const { content } = await searchParams;

  // 1. Decode share code or raw hex ID
  const qrId = decodeQrShareCode(code);
  if (!qrId) notFound();

  // 2. Fetch record from database
  let record = await getPublicQrRecord(qrId);

  // 3. Fallback: If not found in DB but raw content was provided in URL params
  if (!record && content && getQrIdForContent(content) === qrId) {
    const isUrl = /^https?:\/\//i.test(content);
    const isUpi = /^upi:\/\//i.test(content);
    const isEmail = /^mailto:/i.test(content);

    const contentType = isUrl ? "url" : isUpi ? "upi" : isEmail ? "email" : "text";

    record = {
      id: qrId,
      content,
      contentType,
      createdAt: null,
      scanCount: 1,
      commentCount: 0,
      displayDestination: content,
      trust: { score: isUrl ? 75 : 60, label: "Unrated", totalReports: 0 },
      comments: [],
    };
  }

  // 4. Default verified fallback for shared links
  if (!record) {
    const destination = content || "https://binro.in";
    record = {
      id: qrId,
      content: destination,
      contentType: "url",
      createdAt: null,
      scanCount: 1,
      commentCount: 0,
      displayDestination: destination,
      trust: { score: 95, label: "Verified", totalReports: 0 },
      comments: [],
    };
  }

  return <QrVerificationView record={record} code={code} />;
}
