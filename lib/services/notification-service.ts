import { db, rtdb } from "../db/client";
import { NOTIFICATIONS_ENABLED } from "../notifications/config";
import type { Notification, NotificationType } from "./types";

// FIX #2: Add TTL for notifications (30 days) to prevent unbounded storage growth
const NOTIFICATION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_NOTIFICATIONS_PER_USER = 100; // Limit max notifications stored

// ─── Internal helper ─────────────────────────────────────────────────────────
// Platform-agnostic write: pushes a notification item for a single user.
// When NOTIFICATIONS_ENABLED is false this is a no-op.
async function pushNotification(
  userId: string,
  type: NotificationType,
  message: string,
  opts?: { qrCodeId?: string; fromUsername?: string }
): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  
  const notificationData = {
    type,
    message,
    qrCodeId: opts?.qrCodeId ?? null,
    fromUsername: opts?.fromUsername ?? null,
    read: false,
    createdAt: Date.now(),
  };
  
  await rtdb.push(`notifications/${userId}/items`, notificationData);
  
  // Auto-cleanup old notifications after writing
  cleanupOldNotifications(userId).catch(() => {});
}

// FIX #2: Cleanup old notifications to prevent unbounded storage growth
async function cleanupOldNotifications(userId: string): Promise<void> {
  try {
    const data = await rtdb.get(`notifications/${userId}/items`);
    if (!data) return;
    
    const now = Date.now();
    const entries = Object.entries(data) as [string, any][];
    
    // Sort by createdAt descending
    entries.sort((a, b) => b[1].createdAt - a[1].createdAt);
    
    // Keep only recent notifications within TTL and under max limit
    const updates: Record<string, any> = {};
    let keepCount = 0;
    
    for (const [key, val] of entries) {
      const age = now - val.createdAt;
      if (age > NOTIFICATION_TTL_MS || keepCount >= MAX_NOTIFICATIONS_PER_USER) {
        updates[`notifications/${userId}/items/${key}`] = null;
      } else {
        keepCount++;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      await rtdb.update(updates);
    }
  } catch {}
}

// ─── Notify @mentioned users ─────────────────────────────────────────────────
export async function notifyMentionedUsers(
  qrId: string,
  text: string,
  fromUserId: string,
  fromDisplayName: string
): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  const mentions = Array.from(new Set(
    (text.match(/@([a-zA-Z0-9_.-]+)/g) || []).map((m) => m.slice(1).toLowerCase())
  ));
  if (mentions.length === 0) return;
  try {
    const writes: Promise<void>[] = [];
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
          pushNotification(
            targetUserId,
            "mention",
            `${fromDisplayName} mentioned you in a comment`,
            { qrCodeId: qrId }
          )
        );
      } catch {}
    }
    await Promise.all(writes);
  } catch {}
}

// ─── Notify all followers of a QR code ───────────────────────────────────────
// FIX #2: Batch notification writes to reduce Firebase costs and avoid rate limits
// Instead of N separate writes for N followers, we use a single multi-path update
export async function notifyQrFollowers(
  qrId: string,
  type: NotificationType,
  message: string,
  excludeUserId?: string
): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    const { docs } = await db.query(["qrCodes", qrId, "followers"]);
    
    // FIX #2: Batch all notification writes into a single RTDB multi-path update
    // This reduces cost from N writes ($0.06 per 1000) to 1 write regardless of follower count
    const updates: Record<string, any> = {};
    let notificationCount = 0;
    
    for (const d of docs) {
      const followerId = d.data.userId as string;
      if (!followerId || followerId === excludeUserId) continue;
      
      // Use RTDB push-like key generation for unique IDs
      const notificationKey = `notifications/${followerId}/items/${Date.now()}_${Math.random().toString(36).slice(2)}`;
      updates[notificationKey] = {
        type,
        message,
        qrCodeId: qrId,
        read: false,
        createdAt: Date.now(),
      };
      notificationCount++;
    }
    
    // Single atomic write operation regardless of follower count
    if (Object.keys(updates).length > 0) {
      await rtdb.update(updates);
      console.log(`[notify] Sent ${notificationCount} follower notifications in single batch for QR ${qrId}`);
    }
  } catch (e) {
    console.warn("[notify] notifyQrFollowers failed:", e);
  }
}

// ─── Notify QR code owner ─────────────────────────────────────────────────────
// Sends a notification to the owner of the QR code when someone posts a comment.
// Silently skips if the commenter IS the owner.
export async function notifyQrOwner(
  qrId: string,
  fromUserId: string,
  fromDisplayName: string
): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    const qrData = await db.get(["qrCodes", qrId]);
    if (!qrData?.ownerId) return;
    const ownerId = qrData.ownerId as string;
    if (ownerId === fromUserId) return;
    await pushNotification(
      ownerId,
      "owner_comment",
      `${fromDisplayName} commented on your QR code`,
      { qrCodeId: qrId }
    );
  } catch {}
}

// ─── Notify parent comment author on reply ────────────────────────────────────
// When user B replies to user A's comment, A gets notified.
// Also notifies the QR owner if they are different from both A and B.
export async function notifyCommentParentAuthor(
  qrId: string,
  parentCommentId: string,
  fromUserId: string,
  fromDisplayName: string
): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    const parentData = await db.get(["qrCodes", qrId, "comments", parentCommentId]);
    if (!parentData?.userId) return;
    const parentAuthorId = parentData.userId as string;
    if (parentAuthorId === fromUserId) return;
    const parentAuthorName = (parentData.userDisplayName as string) || "your";
    await pushNotification(
      parentAuthorId,
      "comment_reply",
      `${fromDisplayName} replied to your comment`,
      { qrCodeId: qrId }
    );
  } catch {}
}

// ─── Friend request notifications ────────────────────────────────────────────
export async function notifyFriendRequest(
  toUserId: string,
  fromDisplayName: string,
  fromUsername: string
): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    await pushNotification(
      toUserId,
      "friend_request",
      `${fromDisplayName} sent you a friend request`,
      { fromUsername }
    );
  } catch {}
}

export async function notifyFriendAccepted(
  toUserId: string,
  fromDisplayName: string,
  fromUsername: string
): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    await pushNotification(
      toUserId,
      "friend_accepted",
      `${fromDisplayName} accepted your friend request`,
      { fromUsername }
    );
  } catch {}
}

// ─── Subscribe to notification count (badge) ─────────────────────────────────
export function subscribeToNotificationCount(
  userId: string,
  onUpdate: (count: number) => void
): () => void {
  if (!NOTIFICATIONS_ENABLED) {
    onUpdate(0);
    return () => {};
  }
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

// ─── Subscribe to notification list ──────────────────────────────────────────
export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: Notification[]) => void
): () => void {
  if (!NOTIFICATIONS_ENABLED) {
    onUpdate([]);
    return () => {};
  }
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

// ─── Mark all as read ─────────────────────────────────────────────────────────
export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
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

// ─── Clear all ────────────────────────────────────────────────────────────────
export async function clearAllNotifications(userId: string): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    await rtdb.remove(`notifications/${userId}/items`);
  } catch {}
}
