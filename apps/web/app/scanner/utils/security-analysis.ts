/**
 * Direct imports from mobile services & shared utilities:
 *   - @services/analysis/qr-validator
 *   - @services/moderation/profanity-filter
 *   - @shared/utils/qr-content
 *   - @services/cache/anonymous-session
 */

import {
  validateQrContent,
  isValidQrContent,
  type QrValidationResult,
} from "@services/analysis/qr-validator";
import {
  checkProfanity,
  validateQrInput,
  sanitizeComment,
} from "@services/moderation/profanity-filter";
import { detectContentType } from "@shared/utils/qr-content";
import { isPaymentQr } from "@services/analysis";
import {
  setAnonymousQrContent as setMobileAnonymousQrContent,
  getAnonymousQrContent,
  clearAnonymousQrContent,
  clearAllAnonymousSessions,
} from "@services/cache/anonymous-session";
import { getWebSupabase, isWebSupabaseConfigured } from "../../../lib/supabase";

export {
  validateQrContent,
  isValidQrContent,
  type QrValidationResult,
  checkProfanity,
  validateQrInput,
  sanitizeComment,
  detectContentType,
  isPaymentQr,
  getAnonymousQrContent,
  clearAnonymousQrContent,
  clearAllAnonymousSessions,
};

export async function getQrCodeId(content: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(content)
    );
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0")
    )
      .join("")
      .slice(0, 20);
  }
  return "custom";
}

export function setAnonymousQrContent(
  qrId: string,
  content: string,
  contentType: string
): void {
  setMobileAnonymousQrContent(qrId, content, contentType);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`anonymous_qr_${qrId}`, JSON.stringify({ content, contentType }));
    } catch {}
  }
}

export async function getOrCreateQrCode(content: string, _user?: any) {
  const qrId = await getQrCodeId(content);
  const contentType = detectContentType(content);
  const now = new Date().toISOString();
  const fallback = {
    id: qrId,
    content,
    contentType,
    createdAt: now,
    scanCount: 0,
    commentCount: 0,
  };
  try {
    if (isWebSupabaseConfigured()) {
      const supabase = getWebSupabase();
      const { data: existingQr } = await supabase
        .from("qr_codes")
        .select("id")
        .eq("id", qrId)
        .maybeSingle();
      if (!existingQr) {
        await supabase.from("qr_codes").upsert(
          {
            id: qrId,
            content,
            content_type: contentType,
            scan_count: 1,
            comment_count: 0,
            created_at: now,
          },
          { onConflict: "id" }
        );
      }
    }
  } catch {}
  return fallback;
}

export async function recordScan(
  qrId: string,
  content: string,
  contentType: string,
  userId: string | null,
  isAnonymous: boolean
): Promise<void> {
  if (userId && isAnonymous) return;
  try {
    if (!isWebSupabaseConfigured()) return;
    const supabase = getWebSupabase();
    const { data: qrRow } = await supabase
      .from("qr_codes")
      .select("scan_count")
      .eq("id", qrId)
      .maybeSingle();
    if (qrRow) {
      await supabase
        .from("qr_codes")
        .update({
          scan_count: Math.max(0, Number(qrRow.scan_count ?? 0)) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", qrId);
    }

    if (userId && !isAnonymous) {
      const scanId = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      await supabase.from("qr_scans").insert({
        id: scanId,
        user_id: userId,
        qr_code_id: qrId,
        content,
        content_type: contentType,
        scanned_at: new Date().toISOString(),
        scan_source: "web",
        platform: "web",
        is_anonymous: false,
      });
    }
  } catch (err) {
    console.warn("[security-analysis] Failed to record scan in Supabase:", err);
  }
}

export function emitScanEvent(
  _qrId: string,
  _opts: {
    platform: "android" | "ios" | "web" | "unknown";
    contentType: string;
    verdict: "safe" | "flagged" | "unknown";
  }
): void {
  // Non-blocking analytics parity with mobile services/scan-history/scan-events.ts
}
