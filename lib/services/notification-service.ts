import { db, rtdb } from "../db";
import type { Notification } from "./types";

// ── Cost optimization: instead of reading ALL users to find mentions,
//    we query by username field. This is a targeted indexed read.
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
    const writes: Promise<any>[] = [];
    for (const username of mentions) {
      try {
        const { docs } = await db.query(["users"], {
          where: [{ field: "username", op: "==", value: username }],
          limit: 1,
        });
        if (docs.length === 0) continue;
        const targetUserId = docs[0].id;
        if (targetUserId === fromUserId) continue;
        writes.push(
          rtdb.push(`notifications/${targetUserId}/items`, {
            type: "mention",
            qrCodeId: qrId,
            message: `${fromDisplayName} mentioned you in a comment`,
            read: false,
            createdAt: Date.now(),
          })
        );
      } catch {}
    }
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
    const { docs } = await db.query(["qrCodes", qrId, "followers"]);
    const writes: Promise<any>[] = [];
    for (const d of docs) {
      const followerId = d.data.userId as string;
      if (!followerId || followerId === excludeUserId) continue;
      writes.push(rtdb.push(`notifications/${followerId}/items`, {
        type, qrCodeId: qrId, message, read: false, createdAt: Date.now(),
      }));
    }
    await Promise.all(writes);
  } catch {}
}

export function subscribeToNotificationCount(
  userId: string,
  onUpdate: (count: number) => void
): () => void {
  const path = `notifications/${userId}/items`;
  const handler = (data: any) => {
    if (!data) { onUpdate(0); return; }
    let unread = 0;
    for (const key of Object.keys(data)) {
      if (!data[key].read) unread++;
    }
    onUpdate(unread);
  };
  rtdb.onValue(path, handler);
  return () => rtdb.offValue(path, handler);
}

export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: Notification[]) => void
): () => void {
  const path = `notifications/${userId}/items`;
  const handler = (data: any) => {
    if (!data) { onUpdate([]); return; }
    const items: Notification[] = Object.entries(data).map(([key, val]: [string, any]) => ({
      id: key,
      ...val,
    }));
    items.sort((a, b) => b.createdAt - a.createdAt);
    onUpdate(items);
  };
  rtdb.onValue(path, handler);
  return () => rtdb.offValue(path, handler);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const data = await rtdb.get(`notifications/${userId}/items`);
    if (!data) return;
    const updates: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (!data[key].read) {
        updates[`notifications/${userId}/items/${key}/read`] = true;
      }
    }
    if (Object.keys(updates).length > 0) await rtdb.update(updates);
  } catch {}
}

export async function clearAllNotifications(userId: string): Promise<void> {
  try {
    await rtdb.remove(`notifications/${userId}/items`);
  } catch {}
}
