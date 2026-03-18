import { db, rtdb } from "../db";
import { isPaymentQr } from "../qr-analysis";
import * as Crypto from "expo-crypto";
import { tsToString } from "./utils";
import { calculateTrustScore } from "./trust-service";
import { getQrReportCounts, getUserQrReport } from "./report-service";
import { isUserFollowingQrCode, getFollowCount } from "./follow-service";
import { isUserFavorite } from "./user-service";
import type { QrCodeData, TrustScore } from "./types";

export { SIGNATURE_SALT } from "./types";
export type { QrCodeData, TrustScore };

export function detectContentType(content: string): string {
  if (!content) return "text";
  if (isPaymentQr(content)) return "payment";
  if (content.startsWith("tel:")) return "phone";
  if (content.startsWith("mailto:")) return "email";
  if (content.startsWith("WIFI:")) return "wifi";
  if (content.startsWith("geo:")) return "location";
  try { new URL(content); return "url"; } catch { return "text"; }
}

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

export async function recordScan(
  qrId: string,
  content: string,
  contentType: string,
  userId: string | null,
  isAnonymous: boolean
): Promise<void> {
  try {
    await db.increment(["qrCodes", qrId], "scanCount", 1);
  } catch (e) {
    console.warn("[db] recordScan: failed to increment scanCount:", e);
  }
  if (userId && !isAnonymous) {
    try {
      await db.add(["users", userId, "scans"], {
        qrCodeId: qrId, content, contentType,
        isAnonymous: false, scannedAt: db.timestamp(),
      });
    } catch {}
  }
  try {
    await rtdb.push(`qrScanVelocity/${qrId}`, { ts: Date.now() });
  } catch {}
}

export async function getUserScans(userId: string): Promise<any[]> {
  const { docs } = await db.query(
    ["users", userId, "scans"],
    { orderBy: { field: "scannedAt", direction: "desc" }, limit: 100 }
  );
  return docs.map((d) => ({
    id: d.id,
    ...d.data,
    scannedAt: tsToString(d.data.scannedAt),
  }));
}

export async function getUserScansPaginated(
  userId: string,
  pageSize: number = 20,
  cursor?: any
): Promise<{ items: any[]; cursor: any; hasMore: boolean }> {
  const { docs, cursor: newCursor } = await db.query(
    ["users", userId, "scans"],
    { orderBy: { field: "scannedAt", direction: "desc" }, limit: pageSize + 1, cursor }
  );
  const hasMore = docs.length > pageSize;
  const items = hasMore ? docs.slice(0, pageSize) : docs;
  return {
    items: items.map((d) => ({ id: d.id, ...d.data, scannedAt: tsToString(d.data.scannedAt) })),
    cursor: items.length > 0 ? newCursor : null,
    hasMore,
  };
}

export async function loadQrDetail(qrId: string, userId: string | null) {
  const qrCode = await getQrCodeById(qrId);
  if (!qrCode) return null;

  let reportCounts: Record<string, number> = {};
  let followCount = 0;
  try {
    const [rc, fc] = await Promise.all([
      getQrReportCounts(qrId),
      getFollowCount(qrId),
    ]);
    reportCounts = rc;
    followCount = fc;
  } catch {}

  const trustScore = calculateTrustScore(reportCounts);
  let userReport: string | null = null;
  let isFavorite = false;
  let isFollowing = false;

  if (userId) {
    try {
      [userReport, isFavorite, isFollowing] = await Promise.all([
        getUserQrReport(qrId, userId),
        isUserFavorite(qrId, userId),
        isUserFollowingQrCode(qrId, userId),
      ]);
    } catch {}
  }

  return {
    qrCode,
    reportCounts,
    totalScans: qrCode.scanCount,
    totalComments: qrCode.commentCount,
    trustScore,
    followCount,
    userReport,
    isFavorite,
    isFollowing,
  };
}
