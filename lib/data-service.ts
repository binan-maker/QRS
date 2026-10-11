// ─── Compatibility barrel ─────────────────────────────────────────────────────
// Provides a stable data-service import path for consumers of the service layer.
// Re-exports all domain services from services/.

export {
  getUserScansPaginated,
  getUserScans,
  recordScan,
  deleteUserScan,
  deleteAllUserScans,
  deleteDuplicateUserScansByQrCode,
  purgeOldSoftDeleteScans,
  hardDeleteOldSoftDeleteScans,
} from "@/services/scan-history";

export * from "@/services/index";
