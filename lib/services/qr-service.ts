// ─── QR Code Core Service ─────────────────────────────────────────────────────
// Single responsibility: QR code identity, persistence, and live stats.
//
//   detectContentType   → lib/services/qr-content-type.ts
//   recordScan / history → lib/services/scan-history-service.ts
//   loadQrDetail         → lib/services/qr-detail-service.ts

import { db } from "../db";
import { tsToString } from "./utils";
import * as Crypto from "expo-crypto";
import { detectContentType } from "./qr-content-type";
import type { QrCodeData, TrustScore } from "./types";

export { detectContentType } from "./qr-content-type";
export type { QrCodeData, TrustScore };
export { SIGNATURE_SALT } from "./types";

export async function getQrCodeId(content: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, content);
  return hash.slice(0, 20);
}

export async function getOrCreateQrCode(content: string): Promise<QrCodeData> {
  const qrId = await getQrCodeId(content);
  const contentType = detectContentType(content);
  const fallback: QrCodeData = {
    id: qrId, content, contentType,
    createdAt: new Date().toISOString(),
    scanCount: 0, commentCount: 0,
  };
  try {
    const data = await db.get(["qrCodes", qrId]);
    if (data) {
      return {
        id: qrId,
        content: data.content || content,
        contentType: data.contentType || detectContentType(data.content || content),
        createdAt: tsToString(data.createdAt),
        scanCount: data.scanCount || 0,
        commentCount: data.commentCount || 0,
        ownerId: data.ownerId,
        ownerName: data.ownerName,
        brandedUuid: data.brandedUuid,
        isBranded: data.isBranded || false,
        signature: data.signature,
        ownerVerified: data.ownerVerified || false,
      };
    }
    await db.set(["qrCodes", qrId], {
      content, contentType,
      createdAt: db.timestamp(),
      scanCount: 0, commentCount: 0,
    });
  } catch (e) {
    console.warn("[db] getOrCreateQrCode failed:", e);
  }
  return fallback;
}

export async function getQrCodeById(qrId: string): Promise<QrCodeData | null> {
  try {
    const data = await db.get(["qrCodes", qrId]);
    if (!data) return null;
    return {
      id: qrId,
      content: data.content,
      contentType: data.contentType,
      createdAt: tsToString(data.createdAt),
      scanCount: data.scanCount || 0,
      commentCount: data.commentCount || 0,
    };
  } catch (e) {
    console.warn("[db] getQrCodeById failed:", e);
    return null;
  }
}

export function subscribeToQrStats(
  qrId: string,
  onUpdate: (data: { scanCount: number; commentCount: number }) => void
): () => void {
  return db.onDoc(["qrCodes", qrId], (data) => {
    if (data) onUpdate({ scanCount: data.scanCount || 0, commentCount: data.commentCount || 0 });
  });
}
