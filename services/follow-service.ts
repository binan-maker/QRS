import { db } from "@/lib/db/client";
import { tsToString } from "./utils";
import type { FollowerInfo } from "./types";

export type { FollowerInfo };

export async function isUserFollowingQrCode(qrId: string, userId: string): Promise<boolean> {
  try {
    const data = await db.get(["qrCodes", qrId, "follows", userId]);
    return data !== null;
  } catch {
    return false;
  }
}

export async function getQrFollowCount(qrId: string): Promise<number> {
  try {
    const data = await db.get(["qrCodes", qrId]);
    if (typeof data?.followerCount === "number") return data.followerCount;
    const { docs } = await db.query(["qrCodes", qrId, "follows"], { limit: 1000 });
    return docs.length;
  } catch {
    return 0;
  }
}

export async function getQrFollowersList(qrId: string): Promise<FollowerInfo[]> {
  try {
    const { docs } = await db.query(
      ["qrCodes", qrId, "follows"],
      { orderBy: { field: "createdAt", direction: "desc" }, limit: 100 }
    );
    return docs.map((d) => ({
      followerId: d.id,
      followerName: d.data.displayName || d.data.followerName || "Anonymous",
      followerAvatar: d.data.photoURL || d.data.followerAvatar,
      followedAt: tsToString(d.data.createdAt),
      userId: d.id,
      photoURL: d.data.photoURL ?? null,
      displayName: d.data.displayName,
      username: d.data.username ?? null,
    }));
  } catch {
    return [];
  }
}

export async function toggleFollow(
  qrId: string,
  userId: string,
  content: string,
  contentType: string,
  userDisplayName?: string
): Promise<{ isFollowing: boolean; followCount: number }> {
  const alreadyFollowing = await isUserFollowingQrCode(qrId, userId);

  const batch = db.batch();
  if (alreadyFollowing) {
    batch.delete(["qrCodes", qrId, "follows", userId]);
    batch.delete(["users", userId, "following", qrId]);
    batch.increment(["qrCodes", qrId], "followerCount", -1);
  } else {
    const followData = {
      createdAt: db.timestamp(),
      userId,
      displayName: userDisplayName || null,
    };
    batch.set(["qrCodes", qrId, "follows", userId], followData);
    batch.set(["users", userId, "following", qrId], {
      qrCodeId: qrId,
      content,
      contentType,
      createdAt: db.timestamp(),
    });
    batch.increment(["qrCodes", qrId], "followerCount", 1);
  }
  await batch.commit();

  const newCount = await getQrFollowCount(qrId);
  return { isFollowing: !alreadyFollowing, followCount: newCount };
}
