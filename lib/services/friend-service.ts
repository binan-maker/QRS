import { db } from "../db";
import { notifyFriendRequest, notifyFriendAccepted } from "./notification-service";

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
    const doc = await db.get(["users", myUserId, "friends", targetUserId]);
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
    db.set(["users", fromUserId, "friends", toUserId], {
      userId: toUserId,
      displayName: toDisplayName,
      username: toUsername,
      photoURL: toPhotoURL,
      status: "sent",
      createdAt: now,
    }),
    db.set(["users", toUserId, "friends", fromUserId], {
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
  const myEntry = await db.get(["users", fromUserId, "friends", myUserId]);
  await Promise.all([
    db.update(["users", myUserId, "friends", fromUserId], { status: "friends" }),
    db.update(["users", fromUserId, "friends", myUserId], { status: "friends" }),
    notifyFriendAccepted(
      fromUserId,
      (myEntry?.displayName as string) || "Someone",
      (myEntry?.username as string) || ""
    ),
  ]);
}

export async function rejectFriendRequest(myUserId: string, fromUserId: string): Promise<void> {
  await Promise.all([
    db.delete(["users", myUserId, "friends", fromUserId]),
    db.delete(["users", fromUserId, "friends", myUserId]),
  ]);
}

export async function removeFriend(myUserId: string, friendUserId: string): Promise<void> {
  await Promise.all([
    db.delete(["users", myUserId, "friends", friendUserId]),
    db.delete(["users", friendUserId, "friends", myUserId]),
  ]);
}

export async function cancelFriendRequest(myUserId: string, toUserId: string): Promise<void> {
  await Promise.all([
    db.delete(["users", myUserId, "friends", toUserId]),
    db.delete(["users", toUserId, "friends", myUserId]),
  ]);
}

export async function getFriends(userId: string): Promise<FriendEntry[]> {
  const { docs } = await db.query(
    ["users", userId, "friends"],
    { where: [{ field: "status", op: "==", value: "friends" }] }
  );
  return docs.map((d) => ({ id: d.id, ...d.data } as any));
}

export async function getIncomingRequests(userId: string): Promise<FriendEntry[]> {
  const { docs } = await db.query(
    ["users", userId, "friends"],
    { where: [{ field: "status", op: "==", value: "received" }] }
  );
  return docs.map((d) => ({ id: d.id, ...d.data } as any));
}
