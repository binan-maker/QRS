import { firestore, realtimeDB } from "../firebase";
import {
  doc,
  collection,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { tsToString } from "./utils";
import type { FollowerInfo } from "./types";

export type { FollowerInfo };

export async function isUserFollowingQrCode(qrId: string, userId: string): Promise<boolean> {
  const snap = await getDoc(doc(firestore, "qrCodes", qrId, "followers", userId));
  return snap.exists();
}

export async function getFollowCount(qrId: string): Promise<number> {
  const snap = await getDocs(collection(firestore, "qrCodes", qrId, "followers"));
  return snap.size;
}

export async function getQrFollowCount(qrId: string): Promise<number> {
  try {
    const snap = await getDocs(collection(firestore, "qrCodes", qrId, "followers"));
    return snap.size;
  } catch { return 0; }
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
