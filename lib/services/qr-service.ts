import { firestore, realtimeDB, firebaseAuth } from "../firebase";
import { isPaymentQr } from "../qr-analysis";
import {
  doc,
  collection,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  getDocs,
  increment,
  serverTimestamp,
  onSnapshot,
  DocumentSnapshot,
  where,
} from "firebase/firestore";
import {
  ref as dbRef,
  push as dbPush,
  get as dbGet,
} from "firebase/database";
import * as Crypto from "expo-crypto";
import { tsToString } from "./utils";
import { calculateTrustScore } from "./trust-service";
import { notifyQrFollowers } from "./notification-service";
import { isUserFavorite } from "./user-service";
import type {
  QrCodeData,
  QrOwnerInfo,
  QrType,
  FollowerInfo,
  ScanVelocityBucket,
  GeneratedQrItem,
  TrustScore,
  VerificationStatus,
} from "./types";

export { SIGNATURE_SALT } from "./types";
export type {
  QrCodeData, QrOwnerInfo, QrType, FollowerInfo,
  ScanVelocityBucket, GeneratedQrItem, TrustScore, VerificationStatus,
};

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

export function subscribeToQrReports(
  qrId: string,
  onUpdate: (counts: Record<string, number>) => void
): () => void {
  const reportsRef = collection(firestore, "qrCodes", qrId, "reports");
  return onSnapshot(
    reportsRef,
    (snap) => {
      const counts: Record<string, number> = {};
      snap.forEach((d) => {
        const { reportType } = d.data();
        counts[reportType] = (counts[reportType] || 0) + 1;
      });
      onUpdate(counts);
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

async function calculateReporterWeight(userId: string | null, emailVerified: boolean): Promise<number> {
  if (!userId) return 0.3;
  let weight = 1.0;
  if (emailVerified) weight += 0.3;
  try {
    const snap = await getDoc(doc(firestore, "users", userId));
    if (snap.exists()) {
      const createdAt = snap.data().createdAt;
      if (createdAt) {
        const d = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        const ageDays = (Date.now() - d.getTime()) / 86400000;
        if (ageDays >= 90) weight += 0.3;
        else if (ageDays >= 30) weight += 0.2;
      }
    }
  } catch {}
  return Math.min(weight, 1.8);
}

export async function getQrReportCounts(qrId: string): Promise<Record<string, number>> {
  const snap = await getDocs(collection(firestore, "qrCodes", qrId, "reports"));
  const counts: Record<string, number> = {};
  snap.forEach((d) => {
    const { reportType } = d.data();
    counts[reportType] = (counts[reportType] || 0) + 1;
  });
  return counts;
}

export async function getUserQrReport(qrId: string, userId: string): Promise<string | null> {
  const snap = await getDoc(doc(firestore, "qrCodes", qrId, "reports", userId));
  return snap.exists() ? snap.data().reportType : null;
}

export async function reportQrCode(
  qrId: string,
  userId: string,
  reportType: string,
  emailVerified: boolean = false
): Promise<Record<string, number>> {
  const weight = await calculateReporterWeight(userId, emailVerified);
  await setDoc(doc(firestore, "qrCodes", qrId, "reports", userId), {
    reportType, weight, reporterId: userId, createdAt: serverTimestamp(),
  });
  notifyQrFollowers(qrId, "new_report", `New ${reportType} report on a QR you follow`, userId).catch(() => {});
  return getQrReportCounts(qrId);
}

export async function isUserFollowingQrCode(qrId: string, userId: string): Promise<boolean> {
  const snap = await getDoc(doc(firestore, "qrCodes", qrId, "followers", userId));
  return snap.exists();
}

export async function getFollowCount(qrId: string): Promise<number> {
  const snap = await getDocs(collection(firestore, "qrCodes", qrId, "followers"));
  return snap.size;
}

export async function toggleFollow(
  qrId: string,
  userId: string,
  content: string,
  contentType: string,
  followerDisplayName?: string
): Promise<{ isFollowing: boolean; followCount: number }> {
  const following = await isUserFollowingQrCode(qrId, userId);
  if (following) {
    await deleteDoc(doc(firestore, "qrCodes", qrId, "followers", userId));
    await deleteDoc(doc(firestore, "users", userId, "following", qrId));
  } else {
    await setDoc(doc(firestore, "qrCodes", qrId, "followers", userId), {
      userId, createdAt: serverTimestamp(),
    });
    await setDoc(doc(firestore, "users", userId, "following", qrId), {
      qrCodeId: qrId, content, contentType, createdAt: serverTimestamp(),
    });
    try {
      const qrSnap = await getDoc(doc(firestore, "qrCodes", qrId));
      if (qrSnap.exists() && qrSnap.data().ownerId && qrSnap.data().ownerId !== userId) {
        const ownerId = qrSnap.data().ownerId as string;
        const { ref: dbRef2, push: dbPush2 } = await import("firebase/database");
        const userNotifRef = dbRef2(realtimeDB, `notifications/${ownerId}/items`);
        const name = followerDisplayName || "Someone";
        await dbPush2(userNotifRef, {
          type: "new_follow",
          qrCodeId: qrId,
          message: `${name} started following your QR code`,
          read: false,
          createdAt: Date.now(),
        });
      }
    } catch {}
  }
  const followCount = await getFollowCount(qrId);
  return { isFollowing: !following, followCount };
}

export async function getQrFollowCount(qrId: string): Promise<number> {
  try {
    const snap = await getDocs(collection(firestore, "qrCodes", qrId, "followers"));
    return snap.size;
  } catch { return 0; }
}

export async function getQrFollowersList(qrId: string): Promise<FollowerInfo[]> {
  try {
    const snap = await getDocs(collection(firestore, "qrCodes", qrId, "followers"));
    const followers: FollowerInfo[] = [];
    const userFetches = snap.docs.map(async (d) => {
      const data = d.data();
      const userId = data.userId || d.id;
      let displayName = "User";
      let username: string | null = null;
      let photoURL: string | null = null;
      try {
        const userSnap = await getDoc(doc(firestore, "users", userId));
        if (userSnap.exists()) {
          const ud = userSnap.data();
          displayName = ud.displayName || "User";
          username = ud.username || null;
          photoURL = ud.photoURL || null;
        }
      } catch {}
      followers.push({ userId, displayName, followedAt: tsToString(data.createdAt), username, photoURL });
    });
    await Promise.all(userFetches);
    return followers.sort((a, b) => new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime());
  } catch { return []; }
}

export async function loadQrDetail(qrId: string, userId: string | null) {
  const qrCode = await getQrCodeById(qrId);
  if (!qrCode) return null;

  let reportCounts: Record<string, number> = {};
  let followCount = 0;
  try {
    const [rSnap, fSnap] = await Promise.all([
      getDocs(collection(firestore, "qrCodes", qrId, "reports")),
      getDocs(collection(firestore, "qrCodes", qrId, "followers")),
    ]);
    rSnap.forEach((d) => {
      const { reportType } = d.data();
      reportCounts[reportType] = (reportCounts[reportType] || 0) + 1;
    });
    followCount = fSnap.size;
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

export async function saveGeneratedQr(
  userId: string,
  displayName: string,
  content: string,
  contentType: string,
  uuid: string,
  branded: boolean,
  qrType: QrType = "individual",
  businessName?: string | null,
  ownerLogoBase64?: string | null,
  guardUuid?: string | null
): Promise<void> {
  const { SIGNATURE_SALT: SALT } = await import("./types");
  const qrId = await getQrCodeId(content);
  let signature: string | undefined;
  if (branded) {
    try {
      const rawSig = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content + "|" + userId + "|" + SALT
      );
      signature = rawSig.slice(0, 32);
    } catch {}
  }
  await addDoc(collection(firestore, "users", userId, "generatedQrs"), {
    content, contentType, uuid, branded,
    qrCodeId: qrId, qrType,
    businessName: businessName || null,
    guardUuid: guardUuid || null,
    ...(signature ? { signature } : {}),
    createdAt: serverTimestamp(),
  });
  if (branded) {
    const qrRef = doc(firestore, "qrCodes", qrId);
    const snap = await getDoc(qrRef);
    if (snap.exists()) {
      const data = snap.data();
      if (!data.ownerId) {
        await updateDoc(qrRef, {
          ownerId: userId, ownerName: displayName,
          brandedUuid: uuid, isBranded: true,
          qrType, isActive: true,
          businessName: businessName || null,
          ...(signature ? { signature } : {}),
          ...(ownerLogoBase64 ? { ownerLogoBase64 } : {}),
        });
      }
    } else {
      await setDoc(qrRef, {
        content, contentType,
        createdAt: serverTimestamp(),
        scanCount: 0, commentCount: 0,
        ownerId: userId, ownerName: displayName,
        brandedUuid: uuid, isBranded: true,
        qrType, isActive: true,
        businessName: businessName || null,
        ...(signature ? { signature } : {}),
        ...(ownerLogoBase64 ? { ownerLogoBase64 } : {}),
      });
    }
  }
}

export async function getUserGeneratedQrs(userId: string): Promise<GeneratedQrItem[]> {
  try {
    try { await firebaseAuth.currentUser?.getIdToken(true); } catch {}
    const snap = await getDocs(collection(firestore, "users", userId, "generatedQrs"));
    const items: GeneratedQrItem[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      let scanCount = 0;
      let commentCount = 0;
      let isActive = true;
      let deactivationMessage: string | null = null;
      if (data.qrCodeId) {
        try {
          const qrSnap = await getDoc(doc(firestore, "qrCodes", data.qrCodeId));
          if (qrSnap.exists()) {
            const qrData = qrSnap.data();
            scanCount = qrData.scanCount || 0;
            commentCount = qrData.commentCount || 0;
            isActive = qrData.isActive !== false;
            deactivationMessage = qrData.deactivationMessage || null;
          }
        } catch {}
      }
      items.push({
        docId: d.id,
        content: data.content || "",
        contentType: data.contentType || "text",
        uuid: data.uuid || "",
        branded: data.branded !== false,
        qrCodeId: data.qrCodeId || "",
        createdAt: tsToString(data.createdAt),
        fgColor: data.fgColor || "#0A0E17",
        bgColor: data.bgColor || "#F8FAFC",
        logoPosition: data.logoPosition || "center",
        logoUri: data.logoUri || null,
        scanCount, commentCount,
        qrType: (data.qrType as QrType) || "individual",
        isActive, deactivationMessage,
        businessName: data.businessName || null,
        guardUuid: data.guardUuid || null,
      });
    }
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  } catch (e) {
    console.warn("[firestore] getUserGeneratedQrs failed:", e);
    return [];
  }
}

export function subscribeToUserGeneratedQrs(
  userId: string,
  onUpdate: (items: GeneratedQrItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(firestore, "users", userId, "generatedQrs"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: GeneratedQrItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          docId: d.id,
          content: data.content || "",
          contentType: data.contentType || "text",
          uuid: data.uuid || "",
          branded: data.branded !== false,
          qrCodeId: data.qrCodeId || "",
          createdAt: tsToString(data.createdAt),
          fgColor: data.fgColor || "#0A0E17",
          bgColor: data.bgColor || "#F8FAFC",
          logoPosition: data.logoPosition || "center",
          logoUri: data.logoUri || null,
          scanCount: data.scanCount || 0,
          commentCount: data.commentCount || 0,
          qrType: (data.qrType as QrType) || "individual",
          isActive: data.isActive !== false,
          deactivationMessage: data.deactivationMessage || null,
          businessName: data.businessName || null,
          guardUuid: data.guardUuid || null,
        };
      });
      onUpdate(items);
    },
    (err) => {
      console.warn("[firestore] subscribeToUserGeneratedQrs error:", err);
      if (onError) onError(err);
    }
  );
}

export async function updateQrDesign(
  userId: string,
  docId: string,
  design: { fgColor: string; bgColor: string; logoPosition: string; logoUri: string | null }
): Promise<void> {
  try {
    await updateDoc(doc(firestore, "users", userId, "generatedQrs", docId), {
      fgColor: design.fgColor,
      bgColor: design.bgColor,
      logoPosition: design.logoPosition,
      logoUri: design.logoUri || null,
    });
  } catch (e) {
    console.warn("[firestore] updateQrDesign failed:", e);
    throw e;
  }
}

export async function generateBrandedQr(
  content: string,
  userId: string,
  displayName: string
): Promise<{ qrId: string; signature: string; uuid: string }> {
  const { SIGNATURE_SALT: SALT } = await import("./types");
  const qrId = await getQrCodeId(content);
  const contentType = detectContentType(content);
  const rawSig = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    content + "|" + userId + "|" + SALT
  );
  const signature = rawSig.slice(0, 32);
  const uuidRaw = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    content + Date.now().toString()
  );
  const uuid = uuidRaw.slice(0, 16).toUpperCase().match(/.{1,4}/g)?.join("-") || uuidRaw.slice(0, 16);
  const qrRef = doc(firestore, "qrCodes", qrId);
  const snap = await getDoc(qrRef);
  if (snap.exists()) {
    const existing = snap.data();
    if (!existing.ownerId) {
      await updateDoc(qrRef, {
        ownerId: userId, ownerName: displayName,
        brandedUuid: uuid, isBranded: true, signature,
      });
    }
  } else {
    await setDoc(qrRef, {
      content, contentType, ownerId: userId, ownerName: displayName,
      brandedUuid: uuid, isBranded: true, signature,
      ownerVerified: false, scanCount: 0, commentCount: 0,
      createdAt: serverTimestamp(),
    });
  }
  await addDoc(collection(firestore, "users", userId, "generatedQrs"), {
    content, contentType, uuid, branded: true, qrCodeId: qrId,
    signature, createdAt: serverTimestamp(),
  });
  return { qrId, signature, uuid };
}

export async function getScanVelocity(qrId: string): Promise<ScanVelocityBucket[]> {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  const buckets: ScanVelocityBucket[] = Array.from({ length: 24 }, (_, i) => {
    const h = new Date(cutoff + i * 60 * 60 * 1000);
    const hour = h.getHours();
    const label = hour === 0 ? "12a" : hour < 12 ? `${hour}a` : hour === 12 ? "12p" : `${hour - 12}p`;
    return { hour: i, label, count: 0 };
  });
  try {
    const snapshot = await dbGet(dbRef(realtimeDB, `qrScanVelocity/${qrId}`));
    if (snapshot.exists()) {
      snapshot.forEach((child: any) => {
        const { ts } = child.val();
        if (ts >= cutoff) {
          const bucketIdx = Math.floor((ts - cutoff) / (60 * 60 * 1000));
          if (bucketIdx >= 0 && bucketIdx < 24) buckets[bucketIdx].count++;
        }
      });
    }
  } catch {}
  return buckets;
}

export async function submitVerificationRequest(
  userId: string,
  qrId: string,
  businessName: string,
  businessIdBase64: string
): Promise<void> {
  const existing = query(
    collection(firestore, "verificationRequests"),
    where("userId", "==", userId),
    where("qrId", "==", qrId),
    firestoreLimit(1)
  );
  const snap = await getDocs(existing);
  if (!snap.empty) {
    const docId = snap.docs[0].id;
    await updateDoc(doc(firestore, "verificationRequests", docId), {
      businessName, businessIdBase64, status: "pending", updatedAt: serverTimestamp(),
    });
    return;
  }
  await addDoc(collection(firestore, "verificationRequests"), {
    userId, qrId, businessName, businessIdBase64,
    status: "pending", createdAt: serverTimestamp(),
  });
}

export async function getVerificationStatus(userId: string, qrId: string): Promise<VerificationStatus> {
  try {
    const q = query(
      collection(firestore, "verificationRequests"),
      where("userId", "==", userId),
      where("qrId", "==", qrId),
      firestoreLimit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return { status: "none" };
    const d = snap.docs[0].data();
    return {
      status: d.status || "pending",
      businessName: d.businessName,
      submittedAt: tsToString(d.createdAt),
    };
  } catch {
    return { status: "none" };
  }
}

export async function getQrOwnerInfo(qrId: string): Promise<QrOwnerInfo | null> {
  try {
    const snap = await getDoc(doc(firestore, "qrCodes", qrId));
    if (!snap.exists()) return null;
    const d = snap.data();
    if (!d.isBranded || !d.ownerId) return null;
    return {
      ownerId: d.ownerId,
      ownerName: d.ownerName || "Unknown",
      brandedUuid: d.brandedUuid || "",
      isBranded: true,
      signature: d.signature,
      ownerVerified: d.ownerVerified || false,
      qrType: (d.qrType as QrType) || "individual",
      isActive: d.isActive !== false,
      deactivationMessage: d.deactivationMessage || null,
      businessName: d.businessName || null,
      ownerLogoBase64: d.ownerLogoBase64 || null,
    };
  } catch {
    return null;
  }
}

export async function setQrActiveState(
  qrId: string,
  userId: string,
  isActive: boolean,
  deactivationMessage: string | null
): Promise<void> {
  const qrRef = doc(firestore, "qrCodes", qrId);
  const snap = await getDoc(qrRef);
  if (!snap.exists()) throw new Error("QR code not found");
  const data = snap.data();
  if (data.qrType === "government") throw new Error("Government QR codes cannot be modified");
  if (data.ownerId !== userId) throw new Error("Only the owner can modify this QR code");
  await updateDoc(qrRef, {
    isActive,
    deactivationMessage: isActive ? null : (deactivationMessage?.trim().slice(0, 100) || null),
  });
}
