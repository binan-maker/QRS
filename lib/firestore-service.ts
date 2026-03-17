import { firestore, realtimeDB, firebaseAuth } from "./firebase";
import { isPaymentQr } from "./qr-analysis";
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
import { checkCommentKeywords } from "./qr-analysis";
import {
  ref as dbRef,
  push as dbPush,
  set as dbSet,
  onValue,
  off,
  update as dbUpdate,
  get as dbGet,
  remove as dbRemove,
} from "firebase/database";
import * as Crypto from "expo-crypto";

export const SIGNATURE_SALT = "QRG_MINT_VERIFIED_2024_PROPRIETARY";

export type QrType = "individual" | "business" | "government";

export interface QrCodeData {
  id: string;
  content: string;
  contentType: string;
  createdAt: string;
  scanCount: number;
  commentCount: number;
  ownerId?: string;
  ownerName?: string;
  brandedUuid?: string;
  isBranded?: boolean;
  signature?: string;
  ownerVerified?: boolean;
  qrType?: QrType;
  isActive?: boolean;
  deactivationMessage?: string | null;
  businessName?: string | null;
}

export interface QrOwnerInfo {
  ownerId: string;
  ownerName: string;
  brandedUuid: string;
  isBranded: boolean;
  signature?: string;
  ownerVerified?: boolean;
  qrType?: QrType;
  isActive?: boolean;
  deactivationMessage?: string | null;
  businessName?: string | null;
  ownerLogoBase64?: string | null;
}

export interface ScanVelocityBucket {
  hour: number;
  label: string;
  count: number;
}

export interface VerificationStatus {
  status: "none" | "pending" | "approved" | "rejected";
  businessName?: string;
  submittedAt?: string;
}

export interface FollowerInfo {
  userId: string;
  displayName: string;
  followedAt: string;
}

export interface QrMessage {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  qrCodeId: string;
  qrBrandedUuid: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface CommentItem {
  id: string;
  qrCodeId: string;
  userId: string;
  text: string;
  parentId: string | null;
  isDeleted: boolean;
  isHidden?: boolean;
  reportCount?: number;
  likeCount: number;
  dislikeCount: number;
  createdAt: string;
  userLike: "like" | "dislike" | null;
  user: { displayName: string };
  userUsername?: string;
  userPhotoURL?: string;
}

export interface TrustScore {
  score: number;
  label: string;
  totalReports: number;
}

export interface Notification {
  id: string;
  type: "new_comment" | "new_report";
  qrCodeId: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export function detectContentType(content: string): string {
  if (!content) return "text";
  if (isPaymentQr(content)) return "payment";
  if (content.startsWith("tel:")) return "phone";
  if (content.startsWith("mailto:")) return "email";
  if (content.startsWith("WIFI:")) return "wifi";
  if (content.startsWith("geo:")) return "location";
  try {
    new URL(content);
    return "url";
  } catch {
    return "text";
  }
}

/**
 * Weighted Trust Algorithm — Anti-Sybil Edition
 *
 * Raw counts drive the display numbers.
 * Weighted counts drive the actual trust score, so coordinated low-credibility
 * reporters (new accounts, unverified) have a much smaller impact.
 *
 * Weight per reporter (stored at report-submission time):
 *   Anonymous / unauthenticated  → 0.3
 *   Authenticated                → 1.0
 *   + email verified             → +0.3
 *   + account age ≥ 30 days      → +0.2
 *   + account age ≥ 90 days      → +0.3 (replaces the 30-day bonus)
 *   Max                          → 1.8
 *
 * Velocity skepticism:
 *   If the weighted negative mass (scam + fake + spam) exceeds 2× the weighted
 *   positive mass AND the raw total is < 15, apply a 30% skepticism discount on
 *   the negative weight — protecting young QR codes from flash attacks.
 *
 * Confidence dampening:
 *   Score is pulled toward 50 when total reports are low, so a single "scam"
 *   report from a new account cannot instantly tank a legitimate QR.
 */
export function calculateTrustScore(
  reportCounts: Record<string, number>,
  weightedCounts?: Record<string, number>
): TrustScore {
  const rawSafe  = reportCounts.safe  || 0;
  const rawScam  = reportCounts.scam  || 0;
  const rawFake  = reportCounts.fake  || 0;
  const rawSpam  = reportCounts.spam  || 0;
  const rawTotal = rawSafe + rawScam + rawFake + rawSpam;

  if (rawTotal === 0) return { score: -1, label: "Unrated", totalReports: 0 };

  const useWeighted = weightedCounts && Object.keys(weightedCounts).length > 0;
  let wSafe  = useWeighted ? (weightedCounts!.safe  || 0) : rawSafe;
  let wScam  = useWeighted ? (weightedCounts!.scam  || 0) : rawScam;
  let wFake  = useWeighted ? (weightedCounts!.fake  || 0) : rawFake;
  let wSpam  = useWeighted ? (weightedCounts!.spam  || 0) : rawSpam;

  // ── Velocity skepticism ──────────────────────────────────────────────────
  // If negative weighted mass heavily outweighs positive AND the QR is new
  // (few total reports), apply a discount on negative weight to dampen flash attacks.
  const wNeg = wScam + wFake + wSpam;
  const wPos = wSafe;
  if (useWeighted && rawTotal < 15 && wNeg > wPos * 2) {
    const skepticism = 0.65; // treat each negative report as 65% of its claimed weight
    wScam *= skepticism;
    wFake *= skepticism;
    wSpam *= skepticism;
  }

  const wTotal = wSafe + wScam + wFake + wSpam;
  if (wTotal === 0) return { score: -1, label: "Unrated", totalReports: rawTotal };

  const safeRatio = wSafe / wTotal;

  // Confidence grows toward 1.0 as *raw* report count approaches 10.
  // This means a single weighted report cannot produce a definitive score.
  const confidence = Math.min(rawTotal / 10, 1);
  let score = safeRatio * 100;
  score = 50 + (score - 50) * confidence;

  let label = "Dangerous";
  if (score >= 75) label = "Trusted";
  else if (score >= 55) label = "Likely Safe";
  else if (score >= 40) label = "Uncertain";
  else if (score >= 25) label = "Suspicious";
  return { score: Math.round(score), label, totalReports: rawTotal };
}

/**
 * Calculate the credibility weight for a reporter.
 * Anonymous users get 0.3 (down from 0.5) to reduce spam from throwaway attempts.
 * Weights are stored in the report document at write time so they cannot be
 * retroactively inflated by the client.
 */

async function calculateReporterWeight(userId: string | null, emailVerified: boolean): Promise<number> {
  // Anonymous reporters: very low base weight (0.3) so a wave of throwaway
  // accounts cannot easily drive a legitimate QR code's score into the ground.
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
  } catch (e) {
    console.warn("[weight] could not read user doc:", e);
  }
  return Math.min(weight, 1.8);
}

function tsToString(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts.toDate) return ts.toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  return new Date(ts).toISOString();
}

export async function getQrCodeId(content: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    content
  );
  return hash.slice(0, 20);
}

export async function getOrCreateQrCode(content: string): Promise<QrCodeData> {
  const qrId = await getQrCodeId(content);
  const contentType = detectContentType(content);
  const fallback: QrCodeData = {
    id: qrId,
    content,
    contentType,
    createdAt: new Date().toISOString(),
    scanCount: 0,
    commentCount: 0,
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
      content,
      contentType,
      createdAt: serverTimestamp(),
      scanCount: 0,
      commentCount: 0,
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

// Real-time subscription to QR code stats (scanCount, commentCount)
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
    () => {} // swallow permission / network errors
  );
}

// Real-time subscription to QR report counts
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
    () => {} // swallow permission / network errors
  );
}

// Real-time subscription to comments (first page, live updates)
export function subscribeToComments(
  qrId: string,
  pageLimit: number,
  onUpdate: (comments: CommentItem[]) => void
): () => void {
  const q = query(
    collection(firestore, "qrCodes", qrId, "comments"),
    orderBy("createdAt", "desc"),
    firestoreLimit(pageLimit)
  );
  return onSnapshot(
    q,
    (snap) => {
      const comments: CommentItem[] = snap.docs
        .filter((d) => !d.data().isDeleted)
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            qrCodeId: qrId,
            userId: data.userId,
            text: data.text,
            parentId: data.parentId || null,
            isDeleted: false,
            isHidden: data.isHidden || false,
            reportCount: data.reportCount || 0,
            likeCount: data.likeCount || 0,
            dislikeCount: data.dislikeCount || 0,
            createdAt: tsToString(data.createdAt),
            userLike: null,
            user: { displayName: data.userDisplayName || "User" },
            userUsername: data.userUsername || undefined,
            userPhotoURL: data.userPhotoURL || undefined,
          };
        });
      onUpdate(comments);
    },
    () => {} // swallow permission / network errors
  );
}

// Batch-fetch the current user's like/dislike status for a list of comments
export async function getCommentUserLikes(
  qrId: string,
  commentIds: string[],
  userId: string
): Promise<Record<string, "like" | "dislike">> {
  if (!commentIds.length) return {};
  const result: Record<string, "like" | "dislike"> = {};
  await Promise.all(
    commentIds.map(async (commentId) => {
      try {
        const snap = await getDoc(
          doc(firestore, "qrCodes", qrId, "comments", commentId, "likes", userId)
        );
        if (snap.exists()) {
          result[commentId] = snap.data().isLike ? "like" : "dislike";
        }
      } catch (e) {
        console.warn("[firestore] getCommentUserLikes failed for comment", commentId, e);
      }
    })
  );
  return result;
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
        qrCodeId: qrId,
        content,
        contentType,
        isAnonymous: false,
        scannedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn("[firestore] recordScan: failed to save scan history:", e);
    }
  }
  // Record scan timestamp for velocity tracking in Realtime DB
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
  // Calculate and persist the reporter's credibility weight now.
  // Storing it here (at write time) means the trust score calculation can use
  // it later without trusting the client to re-supply it correctly.
  const weight = await calculateReporterWeight(userId, emailVerified);

  await setDoc(doc(firestore, "qrCodes", qrId, "reports", userId), {
    reportType,
    weight,
    reporterId: userId,
    createdAt: serverTimestamp(),
  });

  // Notify followers in Realtime Database
  notifyQrFollowers(qrId, "new_report", `New ${reportType} report on a QR you follow`, userId).catch(() => {});
  return getQrReportCounts(qrId);
}

export async function isUserFavorite(qrId: string, userId: string): Promise<boolean> {
  const snap = await getDoc(doc(firestore, "users", userId, "favorites", qrId));
  return snap.exists();
}

export async function toggleFavorite(
  qrId: string,
  userId: string,
  content: string,
  contentType: string
): Promise<boolean> {
  const isFav = await isUserFavorite(qrId, userId);
  if (isFav) {
    await deleteDoc(doc(firestore, "users", userId, "favorites", qrId));
  } else {
    await setDoc(doc(firestore, "users", userId, "favorites", qrId), {
      qrCodeId: qrId,
      content,
      contentType,
      createdAt: serverTimestamp(),
    });
  }
  return !isFav;
}

export async function getUserFavorites(userId: string): Promise<any[]> {
  const q = query(
    collection(firestore, "users", userId, "favorites"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: tsToString(d.data().createdAt),
  }));
}

export async function isUserFollowingQr(qrId: string, userId: string): Promise<boolean> {
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
  const following = await isUserFollowingQr(qrId, userId);
  if (following) {
    await deleteDoc(doc(firestore, "qrCodes", qrId, "followers", userId));
    await deleteDoc(doc(firestore, "users", userId, "following", qrId));
  } else {
    await setDoc(doc(firestore, "qrCodes", qrId, "followers", userId), {
      userId,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(firestore, "users", userId, "following", qrId), {
      qrCodeId: qrId,
      content,
      contentType,
      createdAt: serverTimestamp(),
    });
    // Notify QR owner when someone new follows their QR
    try {
      const qrSnap = await getDoc(doc(firestore, "qrCodes", qrId));
      if (qrSnap.exists() && qrSnap.data().ownerId && qrSnap.data().ownerId !== userId) {
        const ownerId = qrSnap.data().ownerId as string;
        const userNotifRef = dbRef(realtimeDB, `notifications/${ownerId}/items`);
        const name = followerDisplayName || "Someone";
        await dbPush(userNotifRef, {
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

export async function getUserFollowing(userId: string): Promise<any[]> {
  const q = query(
    collection(firestore, "users", userId, "following"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: tsToString(d.data().createdAt),
  }));
}

export async function getComments(
  qrId: string,
  pageLimit: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ comments: CommentItem[]; hasMore: boolean; lastDoc?: DocumentSnapshot }> {
  let q;
  if (lastDoc) {
    q = query(
      collection(firestore, "qrCodes", qrId, "comments"),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      firestoreLimit(pageLimit + 1)
    );
  } else {
    q = query(
      collection(firestore, "qrCodes", qrId, "comments"),
      orderBy("createdAt", "desc"),
      firestoreLimit(pageLimit + 1)
    );
  }
  const snap = await getDocs(q);
  const hasMore = snap.docs.length > pageLimit;
  const allDocs = hasMore ? snap.docs.slice(0, pageLimit) : snap.docs;
  const docs = allDocs.filter((d) => !d.data().isDeleted);
  const comments: CommentItem[] = docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      qrCodeId: qrId,
      userId: data.userId,
      text: data.text,
      parentId: data.parentId || null,
      isDeleted: false,
      isHidden: data.isHidden || false,
      reportCount: data.reportCount || 0,
      likeCount: data.likeCount || 0,
      dislikeCount: data.dislikeCount || 0,
      createdAt: tsToString(data.createdAt),
      userLike: null,
      user: { displayName: data.userDisplayName || "User" },
      userUsername: data.userUsername || undefined,
      userPhotoURL: data.userPhotoURL || undefined,
    };
  });
  return { comments, hasMore, lastDoc: allDocs[allDocs.length - 1] };
}

export async function addComment(
  qrId: string,
  userId: string,
  displayName: string,
  text: string,
  parentId: string | null = null
): Promise<CommentItem> {
  // Keyword blacklist check — block spam/scam comments at submission
  const kwCheck = checkCommentKeywords(text);
  if (kwCheck.blocked) {
    throw new Error(
      `Your comment was blocked because it contains content that resembles spam or a scam ("${kwCheck.matchedKeyword}"). Please revise your comment.`
    );
  }

  // Fetch the user's @username and photoURL to store with the comment
  let userUsername: string | undefined;
  let userPhotoURL: string | undefined;
  try {
    const userSnap = await getDoc(doc(firestore, "users", userId));
    if (userSnap.exists()) {
      if (userSnap.data().username) userUsername = userSnap.data().username as string;
      if (userSnap.data().photoURL) userPhotoURL = userSnap.data().photoURL as string;
    }
  } catch {}

  const ref = collection(firestore, "qrCodes", qrId, "comments");
  const docRef = await addDoc(ref, {
    userId,
    userDisplayName: displayName,
    ...(userUsername ? { userUsername } : {}),
    ...(userPhotoURL ? { userPhotoURL } : {}),
    text,
    parentId,
    isDeleted: false,
    isHidden: false,
    reportCount: 0,
    likeCount: 0,
    dislikeCount: 0,
    createdAt: serverTimestamp(),
  });
  try {
    await updateDoc(doc(firestore, "qrCodes", qrId), { commentCount: increment(1) });
  } catch (e) {
    console.warn("[firestore] addComment: failed to increment commentCount:", e);
  }
  try {
    await setDoc(doc(firestore, "users", userId, "comments", docRef.id), {
      commentId: docRef.id,
      qrCodeId: qrId,
      text,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[firestore] addComment: failed to sync user comment record:", e);
  }
  // Notify followers that a new comment was added
  notifyQrFollowers(
    qrId,
    "new_comment",
    `${displayName} commented on a QR you follow`,
    userId
  ).catch(() => {});
  // Notify @mentioned users
  notifyMentionedUsers(qrId, text, userId, displayName).catch(() => {});
  return {
    id: docRef.id,
    qrCodeId: qrId,
    userId,
    text,
    parentId,
    isDeleted: false,
    likeCount: 0,
    dislikeCount: 0,
    createdAt: new Date().toISOString(),
    userLike: null,
    user: { displayName },
    userUsername,
  };
}

export async function toggleCommentLike(
  qrId: string,
  commentId: string,
  userId: string,
  isLike: boolean
): Promise<{ likes: number; dislikes: number }> {
  const likeRef = doc(firestore, "qrCodes", qrId, "comments", commentId, "likes", userId);
  const commentRef = doc(firestore, "qrCodes", qrId, "comments", commentId);
  const existing = await getDoc(likeRef);
  if (existing.exists()) {
    const wasLike = existing.data().isLike;
    if (wasLike === isLike) {
      await deleteDoc(likeRef);
      await updateDoc(commentRef, { [isLike ? "likeCount" : "dislikeCount"]: increment(-1) });
    } else {
      await setDoc(likeRef, { isLike, createdAt: serverTimestamp() });
      await updateDoc(commentRef, {
        likeCount: increment(isLike ? 1 : -1),
        dislikeCount: increment(isLike ? -1 : 1),
      });
    }
  } else {
    await setDoc(likeRef, { isLike, createdAt: serverTimestamp() });
    await updateDoc(commentRef, { [isLike ? "likeCount" : "dislikeCount"]: increment(1) });
  }
  const updated = await getDoc(commentRef);
  if (updated.exists()) {
    return { likes: updated.data().likeCount || 0, dislikes: updated.data().dislikeCount || 0 };
  }
  return { likes: 0, dislikes: 0 };
}

export async function reportComment(
  qrId: string,
  commentId: string,
  userId: string,
  reason: string
): Promise<void> {
  const reportRef = doc(firestore, "qrCodes", qrId, "comments", commentId, "reports", userId);
  const commentRef = doc(firestore, "qrCodes", qrId, "comments", commentId);

  // Store the report
  await setDoc(reportRef, { reason, createdAt: serverTimestamp(), userId });

  // Also write to the global moderation queue for the internal team
  try {
    const commentSnap = await getDoc(commentRef);
    const commentData = commentSnap.exists() ? commentSnap.data() : {};
    await addDoc(collection(firestore, "moderationQueue"), {
      type: "comment_report",
      qrCodeId: qrId,
      commentId,
      reportedByUserId: userId,
      reason,
      commentText: commentData.text || "",
      commentAuthorId: commentData.userId || "",
      commentAuthorName: commentData.userDisplayName || "Unknown",
      status: "pending",
      createdAt: serverTimestamp(),
    });
  } catch {}

  // Increment report count and auto-hide if 3+ unique reports
  try {
    const reportsSnap = await getDocs(
      collection(firestore, "qrCodes", qrId, "comments", commentId, "reports")
    );
    const reportCount = reportsSnap.size;
    await updateDoc(commentRef, { reportCount });
    if (reportCount >= 3) {
      await updateDoc(commentRef, { isHidden: true });
    }
  } catch {}
}

export async function ownerHideComment(qrId: string, commentId: string): Promise<void> {
  try {
    await updateDoc(doc(firestore, "qrCodes", qrId, "comments", commentId), { isHidden: true });
  } catch (e) {
    console.warn("[firestore] ownerHideComment failed:", e);
    throw e;
  }
}

export async function softDeleteComment(
  qrId: string,
  commentId: string,
  userId: string
): Promise<void> {
  const ref = doc(firestore, "qrCodes", qrId, "comments", commentId);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().userId === userId) {
    await deleteDoc(ref);
    try {
      await updateDoc(doc(firestore, "qrCodes", qrId), { commentCount: increment(-1) });
    } catch {}
    try {
      await deleteDoc(doc(firestore, "users", userId, "comments", commentId));
    } catch {}
  }
}

export async function getUserComments(userId: string): Promise<any[]> {
  const q = query(
    collection(firestore, "users", userId, "comments"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: tsToString(d.data().createdAt),
  }));
}

export async function submitFeedback(
  userId: string | null,
  email: string | null,
  message: string
): Promise<void> {
  await addDoc(collection(firestore, "feedback"), {
    userId,
    email,
    message,
    createdAt: serverTimestamp(),
  });
}

export async function deleteUserAccount(userId: string): Promise<void> {
  // Soft-delete user document in Firestore
  await updateDoc(doc(firestore, "users", userId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
  });
  // Clean up RTDB notifications
  try {
    await dbRemove(dbRef(realtimeDB, `notifications/${userId}`));
  } catch {}
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
        isUserFollowingQr(qrId, userId),
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

// ─── Firebase Realtime Database: Notifications ───────────────────────────────

// Send a notification to a specifically @mentioned user
async function notifyMentionedUsers(
  qrId: string,
  text: string,
  fromUserId: string,
  fromDisplayName: string
): Promise<void> {
  const mentions = Array.from(new Set(
    (text.match(/@([a-zA-Z0-9_.-]+)/g) || []).map((m) => m.slice(1).toLowerCase())
  ));
  if (mentions.length === 0) return;
  try {
    const usersSnap = await getDocs(collection(firestore, "users"));
    const writes: Promise<any>[] = [];
    usersSnap.forEach((userDoc) => {
      const uname = (userDoc.data().username as string | undefined)?.toLowerCase();
      if (!uname || !mentions.includes(uname)) return;
      const targetUserId = userDoc.id;
      if (targetUserId === fromUserId) return;
      const notifRef = dbRef(realtimeDB, `notifications/${targetUserId}/items`);
      writes.push(
        dbPush(notifRef, {
          type: "mention",
          qrCodeId: qrId,
          message: `${fromDisplayName} mentioned you in a comment`,
          read: false,
          createdAt: Date.now(),
        })
      );
    });
    await Promise.all(writes);
  } catch {}
}

// Send a notification to all followers of a QR code via Realtime Database
export async function notifyQrFollowers(
  qrId: string,
  type: "new_comment" | "new_report",
  message: string,
  excludeUserId?: string
): Promise<void> {
  try {
    const followersSnap = await getDocs(collection(firestore, "qrCodes", qrId, "followers"));
    const writes: Promise<any>[] = [];
    followersSnap.forEach((followerDoc) => {
      const followerId = followerDoc.data().userId as string;
      if (!followerId || followerId === excludeUserId) return;
      const userNotifRef = dbRef(realtimeDB, `notifications/${followerId}/items`);
      writes.push(
        dbPush(userNotifRef, {
          type,
          qrCodeId: qrId,
          message,
          read: false,
          createdAt: Date.now(),
        })
      );
    });
    await Promise.all(writes);
  } catch {}
}

// Subscribe to unread notification count for a user (Realtime Database)
export function subscribeToNotificationCount(
  userId: string,
  onUpdate: (count: number) => void
): () => void {
  const itemsRef = dbRef(realtimeDB, `notifications/${userId}/items`);
  const handler = (snap: any) => {
    if (!snap.exists()) {
      onUpdate(0);
      return;
    }
    let unread = 0;
    snap.forEach((child: any) => {
      if (!child.val().read) unread++;
    });
    onUpdate(unread);
  };
  onValue(itemsRef, handler);
  return () => off(itemsRef, "value", handler);
}

// Get all notifications for a user
export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: Notification[]) => void
): () => void {
  const itemsRef = dbRef(realtimeDB, `notifications/${userId}/items`);
  const handler = (snap: any) => {
    if (!snap.exists()) {
      onUpdate([]);
      return;
    }
    const items: Notification[] = [];
    snap.forEach((child: any) => {
      items.push({ id: child.key, ...child.val() });
    });
    // Sort newest first
    items.sort((a, b) => b.createdAt - a.createdAt);
    onUpdate(items);
  };
  onValue(itemsRef, handler);
  return () => off(itemsRef, "value", handler);
}

// Mark all notifications as read
export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const itemsRef = dbRef(realtimeDB, `notifications/${userId}/items`);
    const snap = await dbGet(itemsRef);
    if (!snap.exists()) return;
    const updates: Record<string, any> = {};
    snap.forEach((child: any) => {
      if (!child.val().read) {
        updates[`notifications/${userId}/items/${child.key}/read`] = true;
      }
    });
    if (Object.keys(updates).length > 0) {
      await dbUpdate(dbRef(realtimeDB), updates);
    }
  } catch {}
}

// Clear all notifications for a user
export async function clearAllNotifications(userId: string): Promise<void> {
  try {
    await dbRemove(dbRef(realtimeDB, `notifications/${userId}/items`));
  } catch {}
}

export interface UserStats {
  followingCount: number;
  scanCount: number;
  commentCount: number;
  totalLikesReceived: number;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    const [followingSnap, scansSnap, commentsSnap, userDoc] = await Promise.all([
      getDocs(collection(firestore, "users", userId, "following")),
      getDocs(collection(firestore, "users", userId, "scans")),
      getDocs(collection(firestore, "users", userId, "comments")),
      getDoc(doc(firestore, "users", userId)),
    ]);
    return {
      followingCount: followingSnap.size,
      scanCount: scansSnap.size,
      commentCount: commentsSnap.size,
      totalLikesReceived: userDoc.exists() ? (userDoc.data().totalLikesReceived || 0) : 0,
    };
  } catch {
    return { followingCount: 0, scanCount: 0, commentCount: 0, totalLikesReceived: 0 };
  }
}

export async function updateUserPhotoURL(userId: string, photoURL: string): Promise<void> {
  try {
    await updateDoc(doc(firestore, "users", userId), { photoURL });
  } catch {}
}

export async function getUserPhotoURL(userId: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(firestore, "users", userId));
    if (snap.exists()) return snap.data().photoURL || null;
  } catch {}
  return null;
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
  const qrId = await getQrCodeId(content);

  // Compute cryptographic signature so the scanner can verify this is a Scan Guard QR
  let signature: string | undefined;
  if (branded) {
    try {
      const rawSig = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content + "|" + userId + "|" + SIGNATURE_SALT
      );
      signature = rawSig.slice(0, 32);
    } catch {}
  }

  await addDoc(collection(firestore, "users", userId, "generatedQrs"), {
    content,
    contentType,
    uuid,
    branded,
    qrCodeId: qrId,
    qrType,
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
          ownerId: userId,
          ownerName: displayName,
          brandedUuid: uuid,
          isBranded: true,
          qrType,
          isActive: true,
          businessName: businessName || null,
          ...(signature ? { signature } : {}),
          ...(ownerLogoBase64 ? { ownerLogoBase64 } : {}),
        });
      }
    } else {
      await setDoc(qrRef, {
        content,
        contentType,
        createdAt: serverTimestamp(),
        scanCount: 0,
        commentCount: 0,
        ownerId: userId,
        ownerName: displayName,
        brandedUuid: uuid,
        isBranded: true,
        qrType,
        isActive: true,
        businessName: businessName || null,
        ...(signature ? { signature } : {}),
        ...(ownerLogoBase64 ? { ownerLogoBase64 } : {}),
      });
    }
  }
}

export interface GeneratedQrItem {
  docId: string;
  content: string;
  contentType: string;
  uuid: string;
  branded: boolean;
  qrCodeId: string;
  createdAt: string;
  fgColor: string;
  bgColor: string;
  logoPosition: string;
  logoUri: string | null;
  scanCount: number;
  commentCount: number;
  qrType: QrType;
  isActive: boolean;
  deactivationMessage: string | null;
  businessName: string | null;
  guardUuid: string | null;
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
        scanCount,
        commentCount,
        qrType: (data.qrType as QrType) || "individual",
        isActive,
        deactivationMessage,
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
  const qrId = await getQrCodeId(content);
  const contentType = detectContentType(content);
  const rawSig = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    content + "|" + userId + "|" + SIGNATURE_SALT
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
      snapshot.forEach((child) => {
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

export async function getQrFollowersList(qrId: string): Promise<FollowerInfo[]> {
  try {
    const snap = await getDocs(collection(firestore, "qrCodes", qrId, "followers"));
    const followers: FollowerInfo[] = [];
    const userFetches = snap.docs.map(async (d) => {
      const data = d.data();
      const userId = data.userId || d.id;
      let displayName = "User";
      try {
        const userSnap = await getDoc(doc(firestore, "users", userId));
        if (userSnap.exists()) {
          displayName = userSnap.data().displayName || "User";
        }
      } catch {}
      followers.push({
        userId,
        displayName,
        followedAt: tsToString(data.createdAt),
      });
    });
    await Promise.all(userFetches);
    return followers.sort((a, b) => new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime());
  } catch {
    return [];
  }
}

export async function sendMessageToQrOwner(
  fromUserId: string,
  fromDisplayName: string,
  toUserId: string,
  qrCodeId: string,
  qrBrandedUuid: string,
  message: string
): Promise<void> {
  await addDoc(collection(firestore, "qrMessages"), {
    fromUserId,
    fromDisplayName,
    toUserId,
    qrCodeId,
    qrBrandedUuid,
    message,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToQrMessages(
  ownerUserId: string,
  qrCodeId: string,
  onUpdate: (msgs: QrMessage[]) => void
): () => void {
  const q = query(
    collection(firestore, "qrMessages"),
    orderBy("createdAt", "desc"),
    firestoreLimit(50)
  );
  return onSnapshot(q, (snap) => {
    const msgs: QrMessage[] = snap.docs
      .filter((d) => {
        const data = d.data();
        return data.toUserId === ownerUserId && data.qrCodeId === qrCodeId;
      })
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          fromUserId: data.fromUserId,
          fromDisplayName: data.fromDisplayName || "User",
          toUserId: data.toUserId,
          qrCodeId: data.qrCodeId,
          qrBrandedUuid: data.qrBrandedUuid || "",
          message: data.message,
          read: data.read || false,
          createdAt: tsToString(data.createdAt),
        };
      });
    onUpdate(msgs);
  }, () => {});
}

export async function markQrMessageRead(messageId: string): Promise<void> {
  try {
    await updateDoc(doc(firestore, "qrMessages", messageId), { read: true });
  } catch {}
}

// ─── Username System ──────────────────────────────────────────────────────────

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(firestore, "usernames", username));
    return !snap.exists();
  } catch (e: any) {
    // Treat permission-denied as available — collection may not have rules deployed yet
    if (e?.code === "permission-denied") return true;
    return false;
  }
}

export async function generateUniqueUsername(displayName: string): Promise<string> {
  const base =
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 15) || "user";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate =
      attempt === 0
        ? base.length >= 3
          ? base
          : base + Math.floor(100 + Math.random() * 900)
        : base.slice(0, 12) + Math.floor(1000 + Math.random() * 9000);
    const available = await checkUsernameAvailable(String(candidate));
    if (available) return String(candidate);
  }
  return "user" + Date.now().toString().slice(-8);
}

export interface UsernameData {
  username: string | null;
  usernameLastChangedAt: Date | null;
}

export async function getUsernameData(userId: string): Promise<UsernameData> {
  try {
    const snap = await getDoc(doc(firestore, "users", userId));
    if (snap.exists()) {
      const data = snap.data();
      const username = data.username || null;
      let usernameLastChangedAt: Date | null = null;
      if (data.usernameLastChangedAt) {
        usernameLastChangedAt = data.usernameLastChangedAt.toDate
          ? data.usernameLastChangedAt.toDate()
          : new Date(data.usernameLastChangedAt);
      }
      return { username, usernameLastChangedAt };
    }
  } catch {}
  return { username: null, usernameLastChangedAt: null };
}

export async function updateUsername(userId: string, newUsername: string): Promise<void> {
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(newUsername)) {
    throw new Error(
      "Username must be 3-20 characters, start with a letter, and contain only letters, numbers, and underscores."
    );
  }

  const userRef = doc(firestore, "users", userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error("User not found.");

  const data = userSnap.data();

  if (data.usernameLastChangedAt) {
    const lastChanged = data.usernameLastChangedAt.toDate
      ? data.usernameLastChangedAt.toDate()
      : new Date(data.usernameLastChangedAt);
    const daysSince = (Date.now() - lastChanged.getTime()) / 86400000;
    if (daysSince < 15) {
      const daysLeft = Math.ceil(15 - daysSince);
      throw new Error(
        `You can change your username every 15 days. Please wait ${daysLeft} more day${daysLeft === 1 ? "" : "s"}.`
      );
    }
  }

  const oldUsername: string | null = data.username || null;

  if (oldUsername === newUsername) return;

  const available = await checkUsernameAvailable(newUsername);
  if (!available) throw new Error("This username is already taken. Please choose another.");

  await setDoc(doc(firestore, "usernames", newUsername), {
    userId,
    reservedAt: serverTimestamp(),
  });

  if (oldUsername) {
    try {
      await deleteDoc(doc(firestore, "usernames", oldUsername));
    } catch {}
  }

  await updateDoc(userRef, {
    username: newUsername,
    usernameLastChangedAt: serverTimestamp(),
  });

  // Update @username in the user's most recent comments (max 50) to keep them current
  try {
    const commentsSnap = await getDocs(
      query(
        collection(firestore, "users", userId, "comments"),
        orderBy("createdAt", "desc"),
        firestoreLimit(50)
      )
    );
    await Promise.all(
      commentsSnap.docs.map(async (d) => {
        const cData = d.data();
        if (cData.qrCodeId && d.id) {
          try {
            await updateDoc(
              doc(firestore, "qrCodes", cData.qrCodeId, "comments", d.id),
              { userUsername: newUsername }
            );
          } catch {}
        }
      })
    );
  } catch {}
}

export async function getUnreadMessageCount(ownerUserId: string): Promise<number> {
  try {
    const q = query(collection(firestore, "qrMessages"));
    const snap = await getDocs(q);
    let count = 0;
    snap.forEach((d) => {
      const data = d.data();
      if (data.toUserId === ownerUserId && !data.read) count++;
    });
    return count;
  } catch {
    return 0;
  }
}

// ─── Living Shield / Guard Links ─────────────────────────────────────────────

export interface GuardLink {
  uuid: string;
  currentDestination: string;
  previousDestination: string | null;
  businessName: string | null;
  ownerName: string;
  ownerId: string;
  isActive: boolean;
  destinationChangedAt: string | null;
  createdAt: string;
}

export async function saveGuardLink(
  uuid: string,
  destination: string,
  businessName: string | null,
  ownerName: string,
  ownerId: string
): Promise<void> {
  await setDoc(doc(firestore, "guardLinks", uuid), {
    uuid,
    currentDestination: destination,
    previousDestination: null,
    businessName: businessName || null,
    ownerName,
    ownerId,
    isActive: true,
    destinationChangedAt: null,
    createdAt: serverTimestamp(),
  });
}

export async function updateGuardLinkDestination(
  uuid: string,
  newDestination: string,
  userId: string
): Promise<void> {
  const ref = doc(firestore, "guardLinks", uuid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Guard link not found");
  const data = snap.data();
  if (data.ownerId !== userId) throw new Error("Not authorized");
  await updateDoc(ref, {
    previousDestination: data.currentDestination,
    currentDestination: newDestination,
    destinationChangedAt: serverTimestamp(),
  });
}

export async function getGuardLink(uuid: string): Promise<GuardLink | null> {
  try {
    const snap = await getDoc(doc(firestore, "guardLinks", uuid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      uuid,
      currentDestination: d.currentDestination || "",
      previousDestination: d.previousDestination || null,
      businessName: d.businessName || null,
      ownerName: d.ownerName || "",
      ownerId: d.ownerId || "",
      isActive: d.isActive !== false,
      destinationChangedAt: d.destinationChangedAt ? tsToString(d.destinationChangedAt) : null,
      createdAt: tsToString(d.createdAt),
    };
  } catch (e) {
    console.warn("[firestore] getGuardLink failed:", e);
    return null;
  }
}

export async function setGuardLinkActive(
  uuid: string,
  userId: string,
  isActive: boolean
): Promise<void> {
  const ref = doc(firestore, "guardLinks", uuid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Guard link not found");
  if (snap.data().ownerId !== userId) throw new Error("Not authorized");
  await updateDoc(ref, { isActive });
}

