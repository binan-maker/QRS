// ─── Compatibility barrel ─────────────────────────────────────────────────────
// Provides a stable data-service import path for consumers of the service layer.
// Re-exports all domain services from services/.

// 1. Scan history & CRUD
export {
  getUserScansPaginated,
  getUserScans,
  syncLocalScansToCloud,
  recordScan,
  deleteUserScan,
  deleteLocalScan,
  deleteAllUserScans,
  deleteDuplicateUserScansByQrCode,
  purgeOldSoftDeleteScans,
  hardDeleteOldSoftDeleteScans,
} from "@/services/scan-history";

// 2. QR code core & content detection
export {
  getOrCreateQrCode,
  getQrCodeId,
  getQrCodeById,
  detectContentType,
  type QrCodeData,
  type TrustScore,
} from "@/services/qr/qr-service";

// 3. Payment detection & analysis
export {
  isPaymentQr,
  parseAnyPaymentQr,
} from "@/services/analysis/payment-parser";

// 4. User profile & account management
export {
  getUserStats,
  updateUserPhotoURL,
  updateUserProfilePhoto,
  getUserPhotoURL,
  getPublicProfile,
  getPublicQrCodes,
  deleteUserAccount,
  submitFeedback,
  type UserStats,
  type PublicProfile,
} from "@/services/user/profile";

// 5. Username services
export {
  checkUsernameAvailable,
  generateUniqueUsername,
  getUsernameData,
  updateUsername,
  type UsernameData,
} from "@/services/user/username";

// 6. Privacy settings
export {
  getPrivacySettings,
  updatePrivacySettings,
  type PrivacySettings,
} from "@/services/user/privacy";

// 7. Comments read & write
export {
  addComment,
  toggleCommentLike,
  softDeleteComment,
  updateComment,
  deleteAllUserComments,
} from "@/services/comments/write";

export {
  getCommentUserLikes,
  getComments,
  getUserComments,
} from "@/services/comments/read";

// 9. Push notifications
export {
  subscribeToNotifications,
  subscribeToNotificationCount,
  markAllNotificationsRead,
  clearAllNotifications,
} from "@/services/notifications/notification-service";
export type { Notification, NotificationType } from "@/services/types";

export * from "@/services/index";

