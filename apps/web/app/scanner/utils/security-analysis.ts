import { validateQrContent, isValidQrContent, type QrValidationResult } from "@services/analysis/qr-validator";
import { checkProfanity, validateQrInput, sanitizeComment } from "@services/moderation/profanity-filter";
import { detectContentType } from "@shared/utils/qr-content";
import { isPaymentQr } from "@services/analysis";
import {
  setAnonymousQrContent as setMobileAnon, getAnonymousQrContent,
  clearAnonymousQrContent, clearAllAnonymousSessions,
} from "@services/cache/anonymous-session";
import { getQrIdFromContentSync } from "../../../lib/qr-share";
import { getWebSupabase, isWebSupabaseConfigured } from "../../../lib/supabase";

export {
  validateQrContent, isValidQrContent, type QrValidationResult,
  checkProfanity, validateQrInput, sanitizeComment,
  detectContentType, isPaymentQr,
  getAnonymousQrContent, clearAnonymousQrContent, clearAllAnonymousSessions,
};

export async function getQrCodeId(content: string): Promise<string> {
  return getQrIdFromContentSync(content);
}

export function setAnonymousQrContent(qrId: string, content: string, contentType: string): void {
  setMobileAnon(qrId, content, contentType);
  if (typeof window !== "undefined") {
    try { sessionStorage.setItem(`anonymous_qr_${qrId}`, JSON.stringify({ content, contentType })); } catch {}
  }
}

export async function getOrCreateQrCode(content: string) {
  const qrId = await getQrCodeId(content);
  const contentType = detectContentType(content);
  const now = new Date().toISOString();
  try {
    if (isWebSupabaseConfigured()) {
      const supabase = getWebSupabase();
      const { data } = await supabase.from("qr_codes").select("id").eq("id", qrId).maybeSingle();
      if (!data) {
        await supabase.from("qr_codes").upsert(
          { id: qrId, content, content_type: contentType, scan_count: 1, comment_count: 0, created_at: now },
          { onConflict: "id" }
        );
      }
    }
  } catch {}
  return { id: qrId, content, contentType, createdAt: now, scanCount: 0, commentCount: 0 };
}

export async function recordScan(
  qrId: string, content: string, contentType: string, userId: string | null, isAnonymous: boolean
): Promise<void> {
  if ((userId && isAnonymous) || !isWebSupabaseConfigured()) return;
  try {
    const supabase = getWebSupabase();
    try {
      await supabase.rpc("increment_field", { p_table: "qr_codes", p_id: qrId, p_field: "scan_count", p_delta: 1 });
    } catch {}

    if (userId && !isAnonymous) {
      const resolvedQrId = qrId && qrId !== "custom" ? qrId : getQrIdFromContentSync(content);
      const scanPayload: Record<string, any> = {
        user_id: userId, qr_code_id: resolvedQrId, content,
        content_type: contentType || "url", scanned_at: new Date().toISOString(),
      };
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        scanPayload.id = crypto.randomUUID();
      }
      try { await supabase.from("qr_scans").insert(scanPayload); } catch {}
      try {
        await supabase.rpc("increment_field", { p_table: "users", p_id: userId, p_field: "scan_count", p_delta: 1 });
      } catch {}
    }
  } catch (err) {
    console.warn("[scan-persistence] Failed to record scan:", err);
  }
}

export function emitScanEvent(_qrId: string, _opts: any): void {}
