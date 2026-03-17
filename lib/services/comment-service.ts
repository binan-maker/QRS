import { firestore } from "../firebase";
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
} from "firebase/firestore";
import { checkCommentKeywords } from "../qr-analysis";
import { tsToString } from "./utils";
import { notifyQrFollowers, notifyMentionedUsers } from "./notification-service";
import type { CommentItem } from "./types";

export type { CommentItem };

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
    () => {}
  );
}

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
      } catch {}
    })
  );
  return result;
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
  const kwCheck = checkCommentKeywords(text);
  if (kwCheck.blocked) {
    throw new Error(
      `Your comment was blocked because it contains content that resembles spam or a scam ("${kwCheck.matchedKeyword}"). Please revise your comment.`
    );
  }

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
  } catch {}
  notifyQrFollowers(qrId, "new_comment", `${displayName} commented on a QR you follow`, userId).catch(() => {});
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
  await setDoc(reportRef, { reason, createdAt: serverTimestamp(), userId });
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
  try {
    const reportsSnap = await getDocs(
      collection(firestore, "qrCodes", qrId, "comments", commentId, "reports")
    );
    const reportCount = reportsSnap.size;
    await updateDoc(commentRef, { reportCount });
    if (reportCount >= 3) await updateDoc(commentRef, { isHidden: true });
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
    try { await updateDoc(doc(firestore, "qrCodes", qrId), { commentCount: increment(-1) }); } catch {}
    try { await deleteDoc(doc(firestore, "users", userId, "comments", commentId)); } catch {}
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
