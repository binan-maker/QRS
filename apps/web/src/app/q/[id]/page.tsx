import type { Metadata } from "next";
import Link from "next/link";
import { createServerApiClient } from "@/lib/api-client";
import type { UnifiedQr, UnifiedQrStatus } from "@/types/api";

export const revalidate = 60; // ISR: revalidate every 60 s

interface Props {
  params: Promise<{ id: string }>;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const api = createServerApiClient();
  const result = await api.unifiedQr.getById(id);

  if (!result.ok) {
    return {
      title: "QR Code Not Found — BinRo",
      description: "This QR code could not be found or may have been deleted.",
    };
  }

  const qr = result.data;
  const ownerName = qr.businessName ?? qr.ownerName ?? "Unknown";
  const title = qr.title ? `${qr.title} — ${ownerName}` : `QR Code by ${ownerName}`;

  return {
    title: `${title} — BinRo`,
    description: `Scan count: ${qr.scanCount}. Check the trust score and safety of this QR code on BinRo.`,
    openGraph: {
      title: `${title} | BinRo`,
      description: `${qr.scanCount} scans. Verified on BinRo — India's QR trust platform.`,
    },
  };
}

// ─── Trust badge ──────────────────────────────────────────────────────────────

function statusToVerdict(status: UnifiedQrStatus): {
  label: string;
  icon: string;
  colour: string;
  bg: string;
  border: string;
  description: string;
} {
  switch (status) {
    case "active":
      return {
        label: "Safe",
        icon: "✅",
        colour: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        description: "This QR code is active and hasn't been flagged by the BinRo community.",
      };
    case "inactive":
      return {
        label: "Deactivated",
        icon: "⛔",
        colour: "text-gray-600",
        bg: "bg-gray-50",
        border: "border-gray-200",
        description: "The owner has deactivated this QR code. Do not proceed.",
      };
    case "expired":
      return {
        label: "Expired",
        icon: "🕐",
        colour: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
        description: "This QR code has passed its expiry date and is no longer valid.",
      };
    case "limit_reached":
      return {
        label: "Limit Reached",
        icon: "🚫",
        colour: "text-orange-700",
        bg: "bg-orange-50",
        border: "border-orange-200",
        description: "This QR code has reached its maximum allowed number of scans.",
      };
  }
}

// ─── Content type label ───────────────────────────────────────────────────────

const CONTENT_TYPE_LABEL: Record<string, string> = {
  upi_payment:      "UPI Payment",
  url:              "Website",
  wifi:             "Wi-Fi",
  vcard:            "Contact",
  sms:              "SMS",
  email:            "Email",
  phone:            "Phone",
  plain_text:       "Text",
  bharatqr:         "BharatQR",
  bbps:             "BBPS Bill",
};

// ─── QR Type badge ────────────────────────────────────────────────────────────

const QR_TYPE_LABEL: Record<string, { label: string; colour: string }> = {
  individual:  { label: "Individual",  colour: "text-blue-600 bg-blue-50 border-blue-200" },
  business:    { label: "Business",    colour: "text-violet-600 bg-violet-50 border-violet-200" },
  government:  { label: "Government",  colour: "text-emerald-700 bg-emerald-50 border-emerald-200" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function QrPublicPage({ params }: Props) {
  const { id } = await params;

  const api = createServerApiClient();
  const result = await api.unifiedQr.getById(id);

  if (!result.ok) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4 bg-gray-50">
        <p className="text-6xl">🔍</p>
        <h1 className="text-xl font-semibold text-gray-900">QR code not found</h1>
        <p className="text-gray-500 text-sm max-w-xs">
          This QR code may have been deleted, or the link is incorrect.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Go to BinRo
        </Link>
      </main>
    );
  }

  const qr: UnifiedQr = result.data;
  const verdict = statusToVerdict(qr.status);
  const qrTypeMeta = QR_TYPE_LABEL[qr.qrType] ?? QR_TYPE_LABEL.individual!;
  const contentTypeLabel = CONTENT_TYPE_LABEL[qr.contentType] ?? qr.contentType;

  const isExpired =
    qr.expiryDate != null && new Date(qr.expiryDate).getTime() < Date.now();
  const isLimitHit =
    qr.scanLimit != null && qr.scanCount >= qr.scanLimit;
  const isSafe = qr.status === "active" && !isExpired && !isLimitHit;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-lg space-y-4">

        {/* ── Trust badge ───────────────────────────────────────────────── */}
        <div className={`rounded-2xl border p-6 text-center ${verdict.bg} ${verdict.border}`}>
          <p className="text-5xl">{verdict.icon}</p>
          <h1 className={`mt-3 text-2xl font-bold ${verdict.colour}`}>
            {verdict.label}
          </h1>
          <p className="mt-2 text-sm text-gray-600 max-w-xs mx-auto">
            {verdict.description}
          </p>
          {!isSafe && (
            <p className="mt-3 text-xs font-semibold text-red-600 uppercase tracking-wide">
              ⚠️ Do not proceed with this QR code
            </p>
          )}
        </div>

        {/* ── Owner info card ───────────────────────────────────────────── */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Created by</p>
              <p className="font-semibold text-gray-900 truncate">
                {qr.businessName ?? qr.ownerName ?? "Anonymous"}
              </p>
              {qr.title && (
                <p className="text-sm text-gray-500 mt-0.5 truncate">{qr.title}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${qrTypeMeta.colour}`}
              >
                {qrTypeMeta.label}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                {contentTypeLabel}
              </span>
            </div>
          </div>
        </div>

        {/* ── Scan stats ────────────────────────────────────────────────── */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Statistics</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-gray-900">
                {qr.scanCount.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Scans</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">
                {qr.downloads.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Downloads</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">
                {qr.shares.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Shares</p>
            </div>
          </div>

          {/* Scan limit progress */}
          {qr.scanLimit != null && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Scan limit</span>
                <span>{qr.scanCount} / {qr.scanLimit.toLocaleString("en-IN")}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isLimitHit ? "bg-red-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(100, (qr.scanCount / qr.scanLimit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Expiry date */}
          {qr.expiryDate && (
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-gray-400">Expires</span>
              <span className={isExpired ? "text-red-600 font-medium" : "text-gray-600"}>
                {isExpired ? "Expired — " : ""}
                {new Date(qr.expiryDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        {/* ── Report button ─────────────────────────────────────────────── */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-medium text-gray-900">Something look suspicious?</p>
          <p className="text-xs text-gray-500 mt-1">
            Report this QR code and help protect the community.
          </p>
          <Link
            href={`https://play.google.com/store`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Report in BinRo app
          </Link>
        </div>

        {/* ── BinRo watermark ───────────────────────────────────────────── */}
        <div className="text-center pt-2 pb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white font-bold text-xs">B</span>
            Verified by BinRo — India&apos;s QR Trust Platform
          </Link>
        </div>

      </div>
    </main>
  );
}
