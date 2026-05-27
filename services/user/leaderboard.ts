import { db } from "@/lib/db/client";

export interface FriendLeaderboardEntry {
  userId: string;
  displayName: string;
  username: string;
  photoURL: string | null;
  scanCount: number;
  rank: number;
  isMe: boolean;
}

export async function getFriendsLeaderboard(myUserId: string): Promise<FriendLeaderboardEntry[]> {
  try {
    const friendsRes = await db.query(
      ["users", myUserId, "friends"],
      { where: [{ field: "status", op: "==", value: "friends" }], limit: 100 }
    );
    const friends = friendsRes.docs.map((d) => ({ userId: d.id, ...d.data } as any));

    const myUserDoc = await db.get(["users", myUserId]);
    const friendDocs = await Promise.all(
      friends.map((f: any) => db.get(["users", f.userId]).catch(() => null))
    );

    const entries: FriendLeaderboardEntry[] = [
      {
        userId: myUserId,
        displayName: myUserDoc?.displayName || "You",
        username: myUserDoc?.username || "",
        photoURL: myUserDoc?.photoURL || null,
        scanCount: (myUserDoc?.personalScanCount as number) || (myUserDoc?.scanCount as number) || 0,
        rank: 0,
        isMe: true,
      },
    ];

    friendDocs.forEach((fDoc, i) => {
      if (!fDoc) return;
      const f = friends[i];
      entries.push({
        userId: f.userId,
        displayName: fDoc.displayName || f.username || "",
        username: f.username || "",
        photoURL: fDoc.photoURL || null,
        scanCount: (fDoc.personalScanCount as number) || (fDoc.scanCount as number) || 0,
        rank: 0,
        isMe: false,
      });
    });

    entries.sort((a, b) => b.scanCount - a.scanCount);
    entries.forEach((e, i) => { e.rank = i + 1; });
    return entries;
  } catch {
    return [];
  }
}
