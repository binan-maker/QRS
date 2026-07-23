import { db, rtdb } from "@/lib/db/client";
import { NOTIFICATIONS_ENABLED } from "./config";
import { API_BASE_URL } from "@/config/api";
import { REQUEST_TIMEOUT_MS } from "@/config/app";
import type { Notification, NotificationType } from "../types";
import { COLLECTIONS } from "@/shared/constants/collections";
import { logger } from "@/lib/logger";

// FIX #2: Add TTL for notifications (30 days) to prevent unbounded storage growth
const NOTIFICATION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_NOTIFICATIONS_PER_USER = 100; // Limit max notifications stored

// ─── Push notification title map ─────────────────────────────────────────────
const PUSH_TITLES: Partial<Record<NotificationType, string>> = {
  mention: "You were mentioned",
  comment: "New Comment",
  follow: "New Follower",
  qr_scan: "Your QR was scanned",
  qr_report: "QR Report",
  system: "BinRo",
};

/** Fire-and-forget helper: sends an Expo push via the server endpoint. */
function deliverPushNotification(
  userId: string,
  type: NotificationType,
  message: string,
): void {
  try {
    const title = PUSH_TITLES[type] ?? "📢 BinRo";
    fetch(`${API_BASE_URL}/api/push/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: userId, title, body: message }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch(() => {});
  } catch {}
}

// ─── Internal helper ─────────────────────────────────────────────────────────
// Platform-agnostic write: pushes a notification item for a single user.
// When NOTIFICATIONS_ENABLED is false this is a no-op.
async function pushNotification(
  userId: string,
  type: NotificationType,
  message: string,
  opts?: { qrCodeId?: string; fromUsername?: string },
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

  // Also send a device push notification (non-blocking, non-critical)
  deliverPushNotification(userId, type, message);

  // Push the item and increment the dedicated unreadCount counter in one
  // multi-path update. The counter node lets subscribeToNotificationCount
  // subscribe to a single integer instead of downloading all notification objects.
  const itemKey = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await rtdb.update({
    [`notifications/${userId}/items/${itemKey}`]: notificationData,
    // Firebase RTDB ServerValue.increment equivalent via set — we read+write
    // in markAllRead so this is safe to overwrite for the push case.
    // Actual atomic increment is handled by the RTDB security rules or by
    // writing a value relative to existing. Since we cannot use transactions
    // here without the raw Firebase SDK, we bump the counter via a best-effort
    // approach: client reads counter then sets counter+1.
    // NOTE: this is acknowledged as eventually-consistent for the badge count.
    // The exact unread count is always correct after markAllRead (which resets to 0).
  });
  // Best-effort counter increment (fire-and-forget, badge is non-critical)
  rtdb
    .get(`notifications/${userId}/unreadCount`)
    .then((cur: any) => {
      const current = typeof cur === "number" ? cur : 0;
      rtdb
        .update({ [`notifications/${userId}/unreadCount`]: current + 1 })
        .catch(() => {});
    })
    .catch(() => {});
  // Cleanup is intentionally NOT called here — the sender cannot read another
  // user's notification list (blocked by RTDB rules). Cleanup runs in
  // markAllNotificationsRead when the owner reads their own data.
}

async function cleanupOldNotifications(userId: string): Promise<void> {
  try {
    const data = await rtdb.get(`notifications/${userId}/items`);
    // FIX: guard against non-object RTDB responses
    if (!data || typeof data !== "object") return;

    const now = Date.now();
    const entries = Object.entries(data) as [string, any][];

    // Sort by createdAt descending
    entries.sort((a, b) => b[1].createdAt - a[1].createdAt);

    // Keep only recent notifications within TTL and under max limit
    const updates: Record<string, any> = {};
    let keepCount = 0;

    for (const [key, val] of entries) {
      const age = now - val.createdAt;
      if (
        age > NOTIFICATION_TTL_MS ||
        keepCount >= MAX_NOTIFICATIONS_PER_USER
      ) {
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
  fromDisplayName: string,
): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  const mentions = Array.from(
    new Set(
      (text.match(/@([a-zA-Z0-9_.-]+)/g) || []).map((m) =>
        m.slice(1).toLowerCase(),
      ),
    ),
  );
  if (mentions.length === 0) return;
  try {
    const writes: Promise<void>[] = [];
    for (const username of mentions) {
      try {
        const { docs } = await db.query([COLLECTIONS.USERS], {
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
            { qrCodeId: qrId },
          ),
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
  excludeUserId?: string,
): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    const { docs } = await db.query([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.FOLLOWERS]);

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
      logger.log(
        `[notify] Sent ${notificationCount} follower notifications in single batch for QR ${qrId}`,
      );
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
  fromDisplayName: string,
): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    const qrData = await db.get([COLLECTIONS.QR_CODES, qrId]);
    if (!qrData?.ownerId) return;
    const ownerId = qrData.ownerId as string;
    if (ownerId === fromUserId) return;
    await pushNotification(
      ownerId,
      "owner_comment",
      `${fromDisplayName} commented on your QR code`,
      { qrCodeId: qrId },
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
  fromDisplayName: string,
): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    const parentData = await db.get([
      "qrCodes",
      qrId,
      "comments",
      parentCommentId,
    ]);
    if (!parentData?.userId) return;
    const parentAuthorId = parentData.userId as string;
    if (parentAuthorId === fromUserId) return;
    const parentAuthorName = (parentData.userDisplayName as string) || "your";
    await pushNotification(
      parentAuthorId,
      "comment_reply",
      `${fromDisplayName} replied to your comment`,
      { qrCodeId: qrId },
    );
  } catch {}
}

// ─── Subscribe to notification count (badge) ─────────────────────────────────
// FIX (expensive O(N) RTDB download for badge): Previously downloaded the entire
// items list and iterated to count unread. Now subscribes to a dedicated
// `unreadCount` integer node that is incremented on push and reset on markAllRead.
// Falls back to scanning items if the counter node is absent (e.g. legacy users).
export function subscribeToNotificationCount(
  userId: string,
  onUpdate: (count: number) => void,
): () => void {
  if (!NOTIFICATIONS_ENABLED) {
    onUpdate(0);
    return () => {};
  }
  const counterPath = `notifications/${userId}/unreadCount`;
  const itemsPath = `notifications/${userId}/items`;

  const counterHandler = (data: any) => {
    if (data === null || data === undefined) {
      // Counter node absent — fall back to counting items (legacy / first use)
      rtdb
        .get(itemsPath)
        .then((items: any) => {
          if (!items || typeof items !== "object") {
            onUpdate(0);
            return;
          }
          let unread = 0;
          for (const key of Object.keys(items)) {
            if (items[key] && !items[key].read) unread++;
          }
          onUpdate(unread);
        })
        .catch(() => onUpdate(0));
      return;
    }
    const n = typeof data === "number" ? data : 0;
    onUpdate(Math.max(0, n));
  };
  rtdb.onValue(counterPath, counterHandler);
  return () => rtdb.offValue(counterPath, counterHandler);
}

// ─── Subscribe to notification list ──────────────────────────────────────────
export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: Notification[]) => void,
): () => void {
  if (!NOTIFICATIONS_ENABLED) {
    onUpdate([]);
    return () => {};
  }
  const path = `notifications/${userId}/items`;
  const handler = (data: any) => {
    if (!data || typeof data !== "object") {
      onUpdate([]);
      return;
    }
    const items: Notification[] = Object.entries(data).map(
      ([key, val]: [string, any]) => ({
        id: key,
        type: val?.type ?? "unknown",
        message: val?.message ?? "",
        qrCodeId: val?.qrCodeId ?? null,
        fromUsername: val?.fromUsername ?? null,
        read: val?.read ?? false,
        createdAt:
          typeof val?.createdAt === "number" ? val.createdAt : Date.now(),
      }),
    );
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
    // FIX: guard against non-object RTDB responses (e.g. null, primitive)
    if (!data || typeof data !== "object") return;
    const updates: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (data[key] && !data[key].read) {
        updates[`notifications/${userId}/items/${key}/read`] = true;
      }
    }
    // Reset the dedicated unreadCount counter to 0 atomically with the mark-read
    updates[`notifications/${userId}/unreadCount`] = 0;
    if (Object.keys(updates).length > 0) await rtdb.update(updates);
    // Run cleanup here — owner just read their own data so rules allow it.
    cleanupOldNotifications(userId).catch(() => {});
  } catch {}
}

// ─── Clear all ────────────────────────────────────────────────────────────────
export async function clearAllNotifications(userId: string): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    await rtdb.remove(`notifications/${userId}/items`);
  } catch {}
}
