import { db } from "../../lib/db/client";
import { supabase } from "../../lib/supabase";
import { getCachedUserProfile, setCachedUserProfile } from "./cache";
import type { UsernameData } from "../types";
import { COLLECTIONS } from "../../shared/constants/collections";
import {
  validateUsername,
  getRemainingUsernameCooldownDays,
} from "../../shared/utils/username-rules";

export type { UsernameData };

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  try {
    const data = await db.get([COLLECTIONS.USERNAMES, username]);
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
      data = await db.get([COLLECTIONS.USERS, userId]);
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
  const { data: sessionData } = await supabase.auth.getSession();
  const activeUid = sessionData?.session?.user?.id;
  if (!activeUid || activeUid !== userId) {
    throw new Error("Unauthorized: You can only edit your own username.");
  }

  const validation = validateUsername(newUsername);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid username format.");
  }

  const userData = await db.get([COLLECTIONS.USERS, userId]);
  if (!userData) throw new Error("User not found.");

  if (userData.usernameLastChangedAt) {
    const lastChanged = userData.usernameLastChangedAt.toDate
      ? userData.usernameLastChangedAt.toDate()
      : new Date(userData.usernameLastChangedAt);
    const daysLeft = getRemainingUsernameCooldownDays(lastChanged);
    if (daysLeft > 0) {
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
    await db.set([COLLECTIONS.USERNAMES, newUsername], { userId, claimedAt: db.timestamp() });
  } catch {
    throw new Error("This username was just taken. Please choose another.");
  }
  // Past username is permanently reserved in usernames & past_usernames - cannot be taken by anyone else
  if (oldUsername) {
    try {
      await db.set([COLLECTIONS.USERNAMES, oldUsername], {
        userId,
        claimedAt: db.timestamp(),
      });
    } catch {}
  }

  const existingPast: string[] = Array.isArray(userData.pastUsernames) ? userData.pastUsernames : [];
  const updatedPast = oldUsername && !existingPast.includes(oldUsername)
    ? [...existingPast, oldUsername]
    : existingPast;

  await db.update([COLLECTIONS.USERS, userId], {
    username: newUsername,
    usernameLastChangedAt: db.timestamp(),
    pastUsernames: updatedPast,
  });

  try {
    const { docs } = await db.query(
      [COLLECTIONS.USERS, userId, COLLECTIONS.COMMENTS],
      { orderBy: { field: "createdAt", direction: "desc" }, limit: 50 }
    );
    await Promise.all(
      docs.map(async (d) => {
        const cData = d.data;
        if (cData.qrCodeId && d.id) {
          try {
            await db.update([COLLECTIONS.QR_CODES, cData.qrCodeId, COLLECTIONS.COMMENTS, d.id], { userUsername: newUsername });
          } catch {}
        }
      })
    );
  } catch {}
}
