import { firestore, realtimeDB } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  ref as dbRef,
  push as dbPush,
  onValue,
  off,
  update as dbUpdate,
  get as dbGet,
  remove as dbRemove,
} from "firebase/database";
import type { Notification } from "./types";

export async function notifyMentionedUsers(
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
      writes.push(dbPush(notifRef, {
        type: "mention",
        qrCodeId: qrId,
        message: `${fromDisplayName} mentioned you in a comment`,
        read: false,
        createdAt: Date.now(),
      }));
    });
    await Promise.all(writes);
  } catch {}
}

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
      writes.push(dbPush(userNotifRef, { type, qrCodeId: qrId, message, read: false, createdAt: Date.now() }));
    });
    await Promise.all(writes);
  } catch {}
}

export function subscribeToNotificationCount(
  userId: string,
  onUpdate: (count: number) => void
): () => void {
  const itemsRef = dbRef(realtimeDB, `notifications/${userId}/items`);
  const handler = (snap: any) => {
    if (!snap.exists()) { onUpdate(0); return; }
    let unread = 0;
    snap.forEach((child: any) => { if (!child.val().read) unread++; });
    onUpdate(unread);
  };
  onValue(itemsRef, handler);
  return () => off(itemsRef, "value", handler);
}

export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: Notification[]) => void
): () => void {
  const itemsRef = dbRef(realtimeDB, `notifications/${userId}/items`);
  const handler = (snap: any) => {
    if (!snap.exists()) { onUpdate([]); return; }
    const items: Notification[] = [];
    snap.forEach((child: any) => { items.push({ id: child.key, ...child.val() }); });
    items.sort((a, b) => b.createdAt - a.createdAt);
    onUpdate(items);
  };
  onValue(itemsRef, handler);
  return () => off(itemsRef, "value", handler);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const itemsRef = dbRef(realtimeDB, `notifications/${userId}/items`);
    const snap = await dbGet(itemsRef);
    if (!snap.exists()) return;
    const updates: Record<string, any> = {};
    snap.forEach((child: any) => {
      if (!child.val().read) updates[`notifications/${userId}/items/${child.key}/read`] = true;
    });
    if (Object.keys(updates).length > 0) await dbUpdate(dbRef(realtimeDB), updates);
  } catch {}
}

export async function clearAllNotifications(userId: string): Promise<void> {
  try {
    await dbRemove(dbRef(realtimeDB, `notifications/${userId}/items`));
  } catch {}
}
