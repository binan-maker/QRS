import { db } from "@/lib/db/client";
import { getCachedUserProfile, setCachedUserProfile } from "./cache";
import type { UsernameData } from "../types";

export type { UsernameData };

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
    displayName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "user";
  for (let attempt = 0; attempt < 15; attempt++) {
    let candidate: string;
    if (attempt === 0 && base.length >= 3) {
      candidate = base;
    } else if (attempt < 5) {
      candidate = base.slice(0, 10) + Math.floor(100 + Math.random() * 900);
    } else {
      candidate = base.slice(0, 8) + Math.floor(10000 + Math.random() * 90000);
    }
    const available = await checkUsernameAvailable(candidate);
    if (available) return candidate;
  }
  return "user" + Date.now().toString().slice(-6) + Math.floor(10 + Math.random() * 90);
}

export async function getUsernameData(userId: string): Promise<UsernameData> {
  try {
    let data = getCachedUserProfile(userId);
    if (!data) {
      data = await db.get(["users", userId]);
      if (data) setCachedUserProfile(userId, data);
    }
    if (data) {
      const username = data.username || null;
      let usernameLastChangedAt: Date | null = null;
      if (data.usernameLastChangedAt) {
        usernameLastChangedAt = data.usernameLastChangedAt.toDate
          ? data.usernameLastChangedAt.toDate()
          : new Date(data.usernameLastChangedAt);
      }
      return { username, usernameLastChangedAt, userId, claimedAt: "" };
    }
  } catch {}
  return { username: null, usernameLastChangedAt: null, userId, claimedAt: "" };
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

  try {
    await db.set(["usernames", newUsername], { userId, reservedAt: db.timestamp() });
  } catch {
    throw new Error("This username was just taken. Please choose another.");
  }
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
