/**
 * @binro/db — Schema types
 * Plain string types instead of custom PostgreSQL enums.
 */

export type QrType = "qr" | "standard" | string;
export type UnifiedQrStatus = "active" | "inactive" | "expired" | "limit_reached" | string;
export type ScanSource = "camera" | "gallery" | "viewed" | string;
export type PlatformType = "android" | "ios" | "web" | "unknown" | string;
export type ScanVerdict = "safe" | "flagged" | "unknown" | string;

