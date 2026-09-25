"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { getWebAuth, getWebDb } from "./firebase";

export type WebQrComment = {
  id: string;
  userId: string | null;
  userName: string;
  userPhotoURL: string | null;
  text: string;
  parentId: string | null;
  likes: number;
  dislikes: number;
  isEdited: boolean;
  createdAt: string | null;
};

export type QrCommunitySummary = {
  reportCounts: Record<string, number>;
  weightedCounts: Record<string, number>;
  trustScore: {
    score: number;
    label: string;
    totalReports: number;
    manipulationWarning?: boolean;
  };
  userReport: string | null;
};

function timestampToString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  const timestamp = value as { toDate?: () => Date; seconds?: number };
  if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();
  return null;
}

function mapComment(id: string, data: DocumentData): WebQrComment {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : null,
    userName: data.userDisplayName ?? data.userName ?? "BinRo user",
    userPhotoURL: data.userPhotoURL ?? data.photoURL ?? data.avatar ?? null,
    text: data.text ?? "",
    parentId: data.parentId ?? null,
    likes: data.likeCount ?? data.likes ?? 0,
    dislikes: data.dislikeCount ?? data.dislikes ?? 0,
    isEdited: data.isEdited === true,
    createdAt: timestampToString(data.createdAt ?? data.updatedAt),
  };
}

function commentsQuery(qrId: string) {
  return query(
    collection(getWebDb(), "qrCodes", qrId, "comments"),
    orderBy("createdAt", "desc"),
    limit(100),
  );
}

export function subscribeToQrStats(
  qrId: string,
  onUpdate: (stats: { scanCount: number; commentCount: number }) => void,
): Unsubscribe {
  return onSnapshot(doc(getWebDb(), "qrCodes", qrId), (snapshot) => {
    const data = snapshot.data();
    if (!data) return;
    onUpdate({
      scanCount: typeof data.scanCount === "number" ? data.scanCount : 0,
      commentCount: typeof data.commentCount === "number" ? data.commentCount : 0,
    });
  });
}

export function subscribeToQrComments(
  qrId: string,
  onUpdate: (comments: WebQrComment[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    commentsQuery(qrId),
    (snapshot) => {
      onUpdate(
        snapshot.docs
          .filter((item) => item.data().isDeleted !== true && item.data().isHidden !== true)
          .map((item) => mapComment(item.id, item.data())),
      );
    },
    (error) => onError?.(error),
  );
}

export async function addQrComment(qrId: string, text: string): Promise<WebQrComment> {
  const user = getWebAuth().currentUser;
  if (!user) throw new Error("Sign in to comment on a QR code.");
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Comment cannot be empty.");
  if (trimmed.length > 500) throw new Error("Comments must be 500 characters or fewer.");

  const ref = await addDoc(collection(getWebDb(), "qrCodes", qrId, "comments"), {
    userId: user.uid,
    userDisplayName: user.displayName ?? user.email?.split("@")[0] ?? "BinRo user",
    userPhotoURL: user.photoURL ?? null,
    text: trimmed,
    parentId: null,
    isDeleted: false,
    isHidden: false,
    reportCount: 0,
    likeCount: 0,
    dislikeCount: 0,
    createdAt: serverTimestamp(),
  });

  return {
    id: ref.id,
    userId: user.uid,
    userName: user.displayName ?? user.email?.split("@")[0] ?? "BinRo user",
    userPhotoURL: user.photoURL ?? null,
    text: trimmed,
    parentId: null,
    likes: 0,
    dislikes: 0,
    isEdited: false,
    createdAt: new Date().toISOString(),
  };
}

export async function updateQrComment(qrId: string, commentId: string, text: string): Promise<void> {
  const user = getWebAuth().currentUser;
  if (!user) throw new Error("Sign in to edit comments.");
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Comment cannot be empty.");
  if (trimmed.length > 500) throw new Error("Comments must be 500 characters or fewer.");

  await updateDoc(doc(getWebDb(), "qrCodes", qrId, "comments", commentId), {
    text: trimmed,
    isEdited: true,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteQrComment(qrId: string, commentId: string): Promise<void> {
  const user = getWebAuth().currentUser;
  if (!user) throw new Error("Sign in to delete comments.");
  await updateDoc(doc(getWebDb(), "qrCodes", qrId, "comments", commentId), {
    text: "[deleted]",
    isDeleted: true,
    deletedAt: serverTimestamp(),
  });
}

export async function toggleQrCommentLike(
  qrId: string,
  commentId: string,
  isLike: boolean,
): Promise<{ liked: boolean; likes: number; dislikes: number }> {
  const user = getWebAuth().currentUser;
  if (!user) throw new Error("Sign in to react to comments.");

  const db = getWebDb();
  const commentRef = doc(db, "qrCodes", qrId, "comments", commentId);
  const likeRef = doc(commentRef, "likes", user.uid);

  return runTransaction(db, async (transaction) => {
    const [commentSnapshot, likeSnapshot] = await Promise.all([
      transaction.get(commentRef),
      transaction.get(likeRef),
    ]);
    if (!commentSnapshot.exists()) throw new Error("Comment no longer exists.");

    const data = commentSnapshot.data();
    const currentLikes = data.likeCount ?? data.likes ?? 0;
    const currentDislikes = data.dislikeCount ?? data.dislikes ?? 0;
    const previous = likeSnapshot.exists() ? likeSnapshot.data().isLike === true : null;

    if (previous === isLike) {
      transaction.delete(likeRef);
      transaction.update(commentRef, {
        [isLike ? "likeCount" : "dislikeCount"]: increment(-1),
      });
      return {
        liked: false,
        likes: Math.max(0, currentLikes - (isLike ? 1 : 0)),
        dislikes: Math.max(0, currentDislikes - (isLike ? 0 : 1)),
      };
    }

    transaction.set(likeRef, { userId: user.uid, isLike, createdAt: serverTimestamp() });
    transaction.update(commentRef, {
      likeCount: increment(isLike ? 1 : previous === false ? 1 : 0),
      dislikeCount: increment(isLike ? previous === false ? -1 : 0 : 1),
    });
    return {
      liked: isLike,
      likes: Math.max(0, currentLikes + (isLike ? 1 : previous === false ? 1 : 0)),
      dislikes: Math.max(0, currentDislikes + (isLike ? previous === false ? -1 : 0 : 1)),
    };
  });
}

export async function fetchQrCommunitySummary(qrId: string): Promise<QrCommunitySummary | null> {
  try {
    const response = await fetch(`/api/v1/qr/${encodeURIComponent(qrId)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: QrCommunitySummary };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export async function submitQrReport(qrId: string, reportType: string): Promise<void> {
  const user = getWebAuth().currentUser;
  if (!user) throw new Error("Sign in to rate this QR code.");
  const token = await user.getIdToken();
  const response = await fetch(`/api/v1/qr/${encodeURIComponent(qrId)}/report`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reportType }),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Your rating could not be saved.");
}