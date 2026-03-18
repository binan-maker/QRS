import { firestore, realtimeDB } from "../firebase";
import { isPaymentQr } from "../qr-analysis";
import {
  doc,
  collection,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  getDocs,
  increment,
  serverTimestamp,
  onSnapshot,
  DocumentSnapshot,
} from "firebase/firestore";
import {
  ref as dbRef,
  push as dbPush,
} from "firebase/database";
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
    const ref = doc(firestore, "qrCodes", qrId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      return {
        id: qrId,
        content: d.content || content,
        contentType: d.contentType || detectContentType(d.content || content),
        createdAt: tsToString(d.createdAt),
        scanCount: d.scanCount || 0,
        commentCount: d.commentCount || 0,
        ownerId: d.ownerId,
        ownerName: d.ownerName,
        brandedUuid: d.brandedUuid,
        isBranded: d.isBranded || false,
        signature: d.signature,
        ownerVerified: d.ownerVerified || false,
      };
    }
    await setDoc(ref, {
      content, contentType,
      createdAt: serverTimestamp(),
      scanCount: 0, commentCount: 0,
    });
  } catch (e) {
    console.warn("[firestore] getOrCreateQrCode failed:", e);
  }
  return fallback;
}

export async function getQrCodeById(qrId: string): Promise<QrCodeData | null> {
  try {
    const snap = await getDoc(doc(firestore, "qrCodes", qrId));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      id: qrId,
      content: d.content,
      contentType: d.contentType,
      createdAt: tsToString(d.createdAt),
      scanCount: d.scanCount || 0,
      commentCount: d.commentCount || 0,
    };
  } catch (e) {
    console.warn("[firestore] getQrCodeById failed:", e);
    return null;
  }
}

export function subscribeToQrStats(
  qrId: string,
  onUpdate: (data: { scanCount: number; commentCount: number }) => void
): () => void {
  const qrRef = doc(firestore, "qrCodes", qrId);
  return onSnapshot(
    qrRef,
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        onUpdate({ scanCount: d.scanCount || 0, commentCount: d.commentCount || 0 });
      }
    },
    () => {}
  );
}

export async function recordScan(
  qrId: string,
  content: string,
  contentType: string,
  userId: string | null,
  isAnonymous: boolean
): Promise<void> {
  try {
    await updateDoc(doc(firestore, "qrCodes", qrId), { scanCount: increment(1) });
  } catch (e) {
    console.warn("[firestore] recordScan: failed to increment scanCount:", e);
  }
  if (userId && !isAnonymous) {
    try {
      await addDoc(collection(firestore, "users", userId, "scans"), {
        qrCodeId: qrId, content, contentType,
        isAnonymous: false, scannedAt: serverTimestamp(),
      });
    } catch {}
  }
  try {
    const velocityRef = dbRef(realtimeDB, `qrScanVelocity/${qrId}`);
    await dbPush(velocityRef, { ts: Date.now() });
  } catch {}
}

export async function getUserScans(userId: string): Promise<any[]> {
  const q = query(
    collection(firestore, "users", userId, "scans"),
    orderBy("scannedAt", "desc"),
    firestoreLimit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    scannedAt: tsToString(d.data().scannedAt),
  }));
}

export async function getUserScansPaginated(
  userId: string,
  pageSize: number = 20,
  afterDoc?: DocumentSnapshot
): Promise<{ items: any[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }> {
  let q;
  if (afterDoc) {
    q = query(
      collection(firestore, "users", userId, "scans"),
      orderBy("scannedAt", "desc"),
      startAfter(afterDoc),
      firestoreLimit(pageSize + 1)
    );
  } else {
    q = query(
      collection(firestore, "users", userId, "scans"),
      orderBy("scannedAt", "desc"),
      firestoreLimit(pageSize + 1)
    );
  }
  const snap = await getDocs(q);
  const hasMore = snap.docs.length > pageSize;
  const docs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;
  const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
  return {
    items: docs.map((d) => ({
      id: d.id,
      ...d.data(),
      scannedAt: tsToString(d.data().scannedAt),
    })),
    lastDoc,
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
