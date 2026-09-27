import { db } from "@/lib/db/client";
import type { AccountTier } from "./types";
import { TIER_CONFIG } from "./types";
import { tsToMs } from "./time-utils";
import { COLLECTIONS } from "@/shared/constants/collections";

export async function getAccountTier(
  userId: string,
  emailVerified: boolean
): Promise<AccountTier & { accountCreatedAt?: number }> {
  try {
    const data = await db.get([COLLECTIONS.USERS, userId]);
    if (!data?.createdAt) return { ...TIER_CONFIG[1], accountCreatedAt: Date.now() };

    const createdMs = tsToMs(data.createdAt);
    const ageDays = (Date.now() - createdMs) / 86400000;

    let tier: 0 | 1 | 2 | 3 | 4 | 5;

    if (ageDays < 1 && !emailVerified) {
      tier = 0;
    } else if (ageDays < 7) {
      tier = 1;
    } else if (ageDays < 30) {
      tier = 2;
    } else if (ageDays < 90) {
      tier = emailVerified ? 3 : 2;
    } else if (ageDays < 180) {
      tier = emailVerified ? 4 : 2;
    } else {
      tier = emailVerified ? 5 : 2;
    }

    return { ...TIER_CONFIG[tier], accountCreatedAt: createdMs };
  } catch {
    return { ...TIER_CONFIG[1], accountCreatedAt: Date.now() };
  }
}
