import { db, rtdb } from "../db";
import { tsToString } from "./utils";
import type { UserStats, UsernameData } from "./types";

export type { UserStats, UsernameData };

export interface PrivacySettings {
  isPrivate: boolean;
  showQrCodes: boolean;
  showStats: boolean;
  showActivity: boolean;
  showRanking: boolean;
  showScanActivity: boolean;
  showFriendsCount: boolean;
}

export interface PublicProfile {
  userId: string;
  displayName: string;
  username: string;
  bio: string;
  photoURL: string | null;
  joinedAt: string | null;
  privacy: PrivacySettings;
  stats: {
    qrCount: number;
    totalScans: number;
    commentCount: number;
    totalLikesReceived: number;
    safeReportsGiven: number;
    personalScanCount: number;
    friendsCount: number;
  };
}

const DEFAULT_PRIVACY: PrivacySettings = {
  isPrivate: false,
  showQrCodes: true,
  showStats: true,
  showActivity: true,
  showRanking: true,
  showScanActivity: true,
  showFriendsCount: true,
};

export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    const [followingResult, scansResult, commentsResult, userDoc] = await Promise.all([
      db.query(["users", userId, "following"]),
      db.query(["users", userId, "scans"]),
      db.query(["users", userId, "comments"]),
      db.get(["users", userId]),
    ]);
    return {
      followingCount: followingResult.docs.length,
      scanCount: scansResult.docs.length,
      commentCount: commentsResult.docs.length,
      totalLikesReceived: userDoc?.totalLikesReceived || 0,
    };
  } catch {
    return { followingCount: 0, scanCount: 0, commentCount: 0, totalLikesReceived: 0 };
  }
}

export async function updateUserPhotoURL(userId: string, photoURL: string): Promise<void> {
  try {
    await db.update(["users", userId], { photoURL });
  } catch {}
}

export async function getUserPhotoURL(userId: string): Promise<string | null> {
  try {
    const data = await db.get(["users", userId]);
    return data?.photoURL || null;
  } catch {}
  return null;
}

export async function isUserFavorite(qrId: string, userId: string): Promise<boolean> {
  const data = await db.get(["users", userId, "favorites", qrId]);
  return data !== null;
}

export async function toggleFavorite(
  qrId: string,
  userId: string,
  content: string,
  contentType: string
): Promise<boolean> {
  const isFav = await isUserFavorite(qrId, userId);
  if (isFav) {
    await db.delete(["users", userId, "favorites", qrId]);
  } else {
    await db.set(["users", userId, "favorites", qrId], {
      qrCodeId: qrId, content, contentType, createdAt: db.timestamp(),
    });
  }
  return !isFav;
}

export async function getUserFavorites(userId: string): Promise<any[]> {
  const { docs } = await db.query(
    ["users", userId, "favorites"],
    { orderBy: { field: "createdAt", direction: "desc" } }
  );
  return docs.map((d) => ({
    id: d.id,
    ...d.data,
    createdAt: tsToString(d.data.createdAt),
  }));
}

export async function getUserFollowing(userId: string): Promise<any[]> {
  const { docs } = await db.query(
    ["users", userId, "following"],
    { orderBy: { field: "createdAt", direction: "desc" } }
  );
  return docs.map((d) => ({
    id: d.id,
    ...d.data,
    createdAt: tsToString(d.data.createdAt),
  }));
}

export async function submitFeedback(
  userId: string | null,
  email: string | null,
  message: string
): Promise<void> {
  await db.add(["feedback"], { userId, email, message, createdAt: db.timestamp() });
}

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  try {
    const unameDoc = await db.get(["usernames", username]);
    if (!unameDoc) return null;
    const userId = unameDoc.userId as string;
    const [userDoc, qrResult] = await Promise.all([
      db.get(["users", userId]),
      db.query(["qrCodes"], {
        where: [{ field: "ownerId", op: "==", value: userId }],
        limit: 200,
      }),
    ]);
    if (!userDoc) return null;
    const privacy: PrivacySettings = {
      isPrivate: userDoc.privacyIsPrivate === true,
      showQrCodes: userDoc.privacyShowQrCodes !== false,
      showStats: userDoc.privacyShowStats !== false,
      showActivity: userDoc.privacyShowActivity !== false,
      showRanking: userDoc.privacyShowRanking !== false,
      showScanActivity: userDoc.privacyShowScanActivity !== false,
      showFriendsCount: userDoc.privacyShowFriendsCount !== false,
    };
    const totalScans = qrResult.docs.reduce((sum: number, d: any) => sum + (d.data.scanCount || 0), 0);
    let joinedAt: string | null = null;
    if (userDoc.createdAt) {
      try {
        joinedAt = userDoc.createdAt.toDate
          ? userDoc.createdAt.toDate().toISOString()
          : new Date(userDoc.createdAt).toISOString();
      } catch {}
    }
    const [personalScansResult, friendsResult] = await Promise.all([
      db.query(["users", userId, "scans"], { limit: 5000 }),
      db.query(["users", userId, "friends"], {
        where: [{ field: "status", op: "==", value: "friends" }],
        limit: 500,
      }),
    ]);
    return {
      userId,
      displayName: userDoc.displayName || username,
      username,
      bio: userDoc.bio || "",
      photoURL: userDoc.photoURL || null,
      joinedAt,
      privacy,
      stats: {
        qrCount: qrResult.docs.length,
        totalScans,
        commentCount: userDoc.commentCount || 0,
        totalLikesReceived: userDoc.totalLikesReceived || 0,
        safeReportsGiven: userDoc.safeReportsGiven || 0,
        personalScanCount: personalScansResult.docs.length,
        friendsCount: friendsResult.docs.length,
      },
    };
  } catch {
    return null;
  }
}

export async function getPublicQrCodes(userId: string): Promise<any[]> {
  try {
    const { docs } = await db.query(["users", userId, "generatedQrs"], {
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 20,
    });
    return docs
      .filter((d: any) => !d.data.privateMode)
      .map((d: any) => ({ id: d.id, ...d.data, createdAt: tsToString(d.data.createdAt) }));
  } catch {
    return [];
  }
}

export async function updatePrivacySettings(userId: string, settings: PrivacySettings): Promise<void> {
  await db.update(["users", userId], {
    privacyIsPrivate: settings.isPrivate,
    privacyShowQrCodes: settings.showQrCodes,
    privacyShowStats: settings.showStats,
    privacyShowActivity: settings.showActivity,
    privacyShowRanking: settings.showRanking,
    privacyShowScanActivity: settings.showScanActivity,
    privacyShowFriendsCount: settings.showFriendsCount,
  });
}

export async function updateBio(userId: string, bio: string): Promise<void> {
  await db.update(["users", userId], { bio: bio.trim().slice(0, 150) });
}

export async function getPrivacySettings(userId: string): Promise<PrivacySettings> {
  try {
    const doc = await db.get(["users", userId]);
    if (!doc) return DEFAULT_PRIVACY;
    return {
      isPrivate: doc.privacyIsPrivate === true,
      showQrCodes: doc.privacyShowQrCodes !== false,
      showStats: doc.privacyShowStats !== false,
      showActivity: doc.privacyShowActivity !== false,
      showRanking: doc.privacyShowRanking !== false,
      showScanActivity: doc.privacyShowScanActivity !== false,
      showFriendsCount: doc.privacyShowFriendsCount !== false,
    };
  } catch {
    return DEFAULT_PRIVACY;
  }
}

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

    const myScansRes = await db.query(["users", myUserId, "scans"], { limit: 5000 });
    const myUserDoc = await db.get(["users", myUserId]);

    const entries: FriendLeaderboardEntry[] = [
      {
        userId: myUserId,
        displayName: myUserDoc?.displayName || "You",
        username: myUserDoc?.username || "",
        photoURL: myUserDoc?.photoURL || null,
        scanCount: myScansRes.docs.length,
        rank: 0,
        isMe: true,
      },
    ];

    await Promise.all(
      friends.map(async (f: any) => {
        const scansRes = await db.query(["users", f.userId, "scans"], { limit: 5000 });
        entries.push({
          userId: f.userId,
          displayName: f.displayName || f.username || "",
          username: f.username || "",
          photoURL: f.photoURL || null,
          scanCount: scansRes.docs.length,
          rank: 0,
          isMe: false,
        });
      })
    );

    entries.sort((a, b) => b.scanCount - a.scanCount);
    entries.forEach((e, i) => { e.rank = i + 1; });
    return entries;
  } catch {
    return [];
  }
}

export async function getUserBio(userId: string): Promise<string> {
  try {
    const doc = await db.get(["users", userId]);
    return doc?.bio || "";
  } catch {
    return "";
  }
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await db.update(["users", userId], {
    isDeleted: true,
    deletedAt: db.timestamp(),
  });
  try {
    await rtdb.remove(`notifications/${userId}`);
  } catch {}
}

export interface UserSearchResult {
  userId: string;
  displayName: string;
  username: string;
  photoURL: string | null;
  bio: string;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  try {
    const { docs } = await db.query(["users"], {
      where: [
        { field: "username", op: ">=", value: q },
        { field: "username", op: "<=", value: q + "\uf8ff" },
      ],
      limit: 20,
    });
    return docs
      .filter((d) => d.data.username && !d.data.isDeleted)
      .map((d) => ({
        userId: d.id,
        displayName: d.data.displayName || d.data.username || "",
        username: d.data.username || "",
        photoURL: d.data.photoURL || null,
        bio: d.data.bio || "",
      }));
  } catch {
    return [];
  }
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  try {
    const data = await db.get(["usernames", username]);
    return data === null;
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
    const data = await db.get(["users", userId]);
    if (data) {
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

  const userData = await db.get(["users", userId]);
  if (!userData) throw new Error("User not found.");

  if (userData.usernameLastChangedAt) {
    const lastChanged = userData.usernameLastChangedAt.toDate
      ? userData.usernameLastChangedAt.toDate()
      : new Date(userData.usernameLastChangedAt);
    const daysSince = (Date.now() - lastChanged.getTime()) / 86400000;
    if (daysSince < 15) {
      const daysLeft = Math.ceil(15 - daysSince);
      throw new Error(
        `You can change your username every 15 days. Please wait ${daysLeft} more day${daysLeft === 1 ? "" : "s"}.`
      );
    }
  }

  const oldUsername: string | null = userData.username || null;
  if (oldUsername === newUsername) return;

  const available = await checkUsernameAvailable(newUsername);
  if (!available) throw new Error("This username is already taken. Please choose another.");

  await db.set(["usernames", newUsername], { userId, reservedAt: db.timestamp() });
  if (oldUsername) {
    try { await db.delete(["usernames", oldUsername]); } catch {}
  }
  await db.update(["users", userId], { username: newUsername, usernameLastChangedAt: db.timestamp() });

  try {
    const { docs } = await db.query(
      ["users", userId, "comments"],
      { orderBy: { field: "createdAt", direction: "desc" }, limit: 50 }
    );
    await Promise.all(
      docs.map(async (d) => {
        const cData = d.data;
        if (cData.qrCodeId && d.id) {
          try {
            await db.update(["qrCodes", cData.qrCodeId, "comments", d.id], { userUsername: newUsername });
          } catch {}
        }
      })
    );
  } catch {}
}
