import { db } from "@/lib/db/client";
import { getCachedUserProfile, setCachedUserProfile } from "./cache";
import type { PrivacySettings } from "./profile";
import { COLLECTIONS } from "@/shared/constants/collections";

export type { PrivacySettings };

export const DEFAULT_PRIVACY: PrivacySettings = {
  isPrivate: false,
  showQrCodes: true,
  showStats: true,
  showActivity: true,
  showRanking: true,
  showScanActivity: true,
  showFriendsCount: true,
};

function docToPrivacy(doc: any): PrivacySettings {
  return {
    isPrivate:        doc.privacyIsPrivate        === true,
    showQrCodes:      doc.privacyShowQrCodes      !== false,
    showStats:        doc.privacyShowStats         !== false,
    showActivity:     doc.privacyShowActivity      !== false,
    showRanking:      doc.privacyShowRanking       !== false,
    showScanActivity: doc.privacyShowScanActivity  !== false,
    showFriendsCount: doc.privacyShowFriendsCount  !== false,
  };
}

export async function getPrivacySettings(userId: string): Promise<PrivacySettings> {
  try {
    let doc = getCachedUserProfile(userId);
    if (!doc) {
      doc = await db.get([COLLECTIONS.USERS, userId]);
      if (doc) setCachedUserProfile(userId, doc);
    }
    if (!doc) return DEFAULT_PRIVACY;
    return docToPrivacy(doc);
  } catch {
    return DEFAULT_PRIVACY;
  }
}

export async function updatePrivacySettings(userId: string, settings: PrivacySettings): Promise<void> {
  await db.update([COLLECTIONS.USERS, userId], {
    privacyIsPrivate:        settings.isPrivate,
    privacyShowQrCodes:      settings.showQrCodes,
    privacyShowStats:        settings.showStats,
    privacyShowActivity:     settings.showActivity,
    privacyShowRanking:      settings.showRanking,
    privacyShowScanActivity: settings.showScanActivity,
    privacyShowFriendsCount: settings.showFriendsCount,
  });
}
