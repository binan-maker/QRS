import { firestore, realtimeDB } from "../firebase";
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
  getDocs,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { remove as dbRemove, ref as dbRef } from "firebase/database";
import { tsToString } from "./utils";
import type { UserStats, UsernameData } from "./types";

export type { UserStats, UsernameData };

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
      qrCodeId: qrId, content, contentType, createdAt: serverTimestamp(),
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

export async function submitFeedback(
  userId: string | null,
  email: string | null,
  message: string
): Promise<void> {
  await addDoc(collection(firestore, "feedback"), {
    userId, email, message, createdAt: serverTimestamp(),
  });
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await updateDoc(doc(firestore, "users", userId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
  });
  try {
    await dbRemove(dbRef(realtimeDB, `notifications/${userId}`));
  } catch {}
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(firestore, "usernames", username));
    return !snap.exists();
  } catch (e: any) {
    if (e?.code === "permission-denied") return true;
    return false;
  }
}

export async function generateUniqueUsername(displayName: string): Promise<string> {
  const base =
    displayName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || "user";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate =
      attempt === 0
        ? base.length >= 3 ? base : base + Math.floor(100 + Math.random() * 900)
        : base.slice(0, 12) + Math.floor(1000 + Math.random() * 9000);
    const available = await checkUsernameAvailable(String(candidate));
    if (available) return String(candidate);
  }
  return "user" + Date.now().toString().slice(-8);
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

  await setDoc(doc(firestore, "usernames", newUsername), { userId, reservedAt: serverTimestamp() });
  if (oldUsername) {
    try { await deleteDoc(doc(firestore, "usernames", oldUsername)); } catch {}
  }
  await updateDoc(userRef, { username: newUsername, usernameLastChangedAt: serverTimestamp() });

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
