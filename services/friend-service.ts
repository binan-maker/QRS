import { db } from "@/lib/db/client";
import { notifyFriendRequest, notifyFriendAccepted } from "./notification-service";
import { COLLECTIONS } from "@/shared/constants/collections";

export type FriendStatus = "none" | "sent" | "received" | "friends";

export interface FriendEntry {
  userId: string;
  displayName: string;
  username: string;
  photoURL: string | null;
  status: FriendStatus;
  createdAt: any;
}

export async function getFriendStatus(myUserId: string, targetUserId: string): Promise<FriendStatus> {
  try {
    const doc = await db.get([COLLECTIONS.USERS, myUserId, COLLECTIONS.FRIENDS, targetUserId]);
    if (!doc) return "none";
    return (doc.status as FriendStatus) ?? "none";
  } catch {
    return "none";
  }
}

export async function sendFriendRequest(
  fromUserId: string,
  fromUsername: string,
  fromDisplayName: string,
  fromPhotoURL: string | null,
  toUserId: string,
  toUsername: string,
  toDisplayName: string,
  toPhotoURL: string | null,
): Promise<void> {
  const now = db.timestamp();
  await Promise.all([
    db.set([COLLECTIONS.USERS, fromUserId, COLLECTIONS.FRIENDS, toUserId], {
      userId: toUserId,
      displayName: toDisplayName,
      username: toUsername,
      photoURL: toPhotoURL,
      status: "sent",
      createdAt: now,
    }),
    db.set([COLLECTIONS.USERS, toUserId, COLLECTIONS.FRIENDS, fromUserId], {
      userId: fromUserId,
      displayName: fromDisplayName,
      username: fromUsername,
      photoURL: fromPhotoURL,
      status: "received",
      createdAt: now,
    }),
    notifyFriendRequest(toUserId, fromDisplayName, fromUsername),
  ]);
}

export async function acceptFriendRequest(myUserId: string, fromUserId: string): Promise<void> {
  const myEntry = await db.get([COLLECTIONS.USERS, fromUserId, COLLECTIONS.FRIENDS, myUserId]);
  await Promise.all([
    db.update([COLLECTIONS.USERS, myUserId, COLLECTIONS.FRIENDS, fromUserId], { status: "friends" }),
    db.update([COLLECTIONS.USERS, fromUserId, COLLECTIONS.FRIENDS, myUserId], { status: "friends" }),
    // FIX #5 BONUS: Increment friendsCount cache on both users
    db.increment([COLLECTIONS.USERS, myUserId], "friendsCount", 1),
    db.increment([COLLECTIONS.USERS, fromUserId], "friendsCount", 1),
    notifyFriendAccepted(
      fromUserId,
      (myEntry?.displayName as string) || "Someone",
      (myEntry?.username as string) || ""
    ),
  ]);
}

export async function rejectFriendRequest(myUserId: string, fromUserId: string): Promise<void> {
  await Promise.all([
    db.delete([COLLECTIONS.USERS, myUserId, COLLECTIONS.FRIENDS, fromUserId]),
    db.delete([COLLECTIONS.USERS, fromUserId, COLLECTIONS.FRIENDS, myUserId]),
  ]);
}

export async function removeFriend(myUserId: string, friendUserId: string): Promise<void> {
  await Promise.all([
    db.delete([COLLECTIONS.USERS, myUserId, COLLECTIONS.FRIENDS, friendUserId]),
    db.delete([COLLECTIONS.USERS, friendUserId, COLLECTIONS.FRIENDS, myUserId]),
    // FIX #5 BONUS: Decrement friendsCount cache on both users
    db.increment([COLLECTIONS.USERS, myUserId], "friendsCount", -1),
    db.increment([COLLECTIONS.USERS, friendUserId], "friendsCount", -1),
  ]);
}

export async function cancelFriendRequest(myUserId: string, toUserId: string): Promise<void> {
  await Promise.all([
    db.delete([COLLECTIONS.USERS, myUserId, COLLECTIONS.FRIENDS, toUserId]),
    db.delete([COLLECTIONS.USERS, toUserId, COLLECTIONS.FRIENDS, myUserId]),
  ]);
}

export async function getFriends(userId: string): Promise<FriendEntry[]> {
  const { docs } = await db.query(
    [COLLECTIONS.USERS, userId, COLLECTIONS.FRIENDS],
    { where: [{ field: "status", op: "==", value: "friends" }] }
  );
  return docs.map((d) => ({ id: d.id, ...d.data } as any));
}

export async function getIncomingRequests(userId: string): Promise<FriendEntry[]> {
  const { docs } = await db.query(
    [COLLECTIONS.USERS, userId, COLLECTIONS.FRIENDS],
    { where: [{ field: "status", op: "==", value: "received" }] }
  );
  return docs.map((d) => ({ id: d.id, ...d.data } as any));
}