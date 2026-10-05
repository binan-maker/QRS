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
import { getQrIdFromContentSync } from "../../../lib/qr-share";
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
  return getQrIdFromContentSync(content);
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

    // 1. Increment scan_count on qr_codes via RPC or fallback update
    try {
      const { error: rpcErr } = await supabase.rpc("increment_field", {
        p_table: "qr_codes",
        p_id: qrId,
        p_field: "scan_count",
        p_delta: 1,
      });
      if (rpcErr) {
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
      }
    } catch {}

    // 2. Record scan in public.qr_scans and increment user's scan_count
    if (userId && !isAnonymous) {
      const resolvedQrId =
        qrId && qrId !== "custom" ? qrId : getQrIdFromContentSync(content);
      const scanPayload: Record<string, any> = {
        user_id: userId,
        qr_code_id: resolvedQrId,
        content,
        content_type: contentType || "url",
        is_deleted: false,
        scanned_at: new Date().toISOString(),
      };
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        scanPayload.id = crypto.randomUUID();
      }
      await supabase.from("qr_scans").insert(scanPayload);

      // Increment user's scan_count in public.users
      try {
        const { error: userRpcErr } = await supabase.rpc("increment_field", {
          p_table: "users",
          p_id: userId,
          p_field: "scan_count",
          p_delta: 1,
        });
        if (userRpcErr) {
          const { data: uRow } = await supabase
            .from("users")
            .select("scan_count")
            .eq("id", userId)
            .maybeSingle();
          if (uRow) {
            await supabase
              .from("users")
              .update({
                scan_count: Math.max(0, Number(uRow.scan_count ?? 0)) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);
          }
        }
      } catch {}
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
