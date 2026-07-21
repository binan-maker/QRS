// ═══════════════════════════════════════════════════════════════════════════════
// REPOSITORY INTERFACES — provider-agnostic contracts for all data operations.
// ───────────────────────────────────────────────────────────────────────────────
// These interfaces define WHAT the application can do with data.
// The HOW (Firebase, Supabase, Postgres, etc.) lives in the implementations.
//
// Current implementations:
//   Auth         → lib/auth/providers/firebase.ts
//   Database     → lib/db/providers/firebase.ts
//   Storage      → lib/storage/providers/firebase.ts
//   Realtime DB  → lib/db/providers/firebase.ts (RealtimeAdapter)
//
// To migrate to a new provider: add a new file in the relevant providers/
// directory, implement the interface, and swap the export in the index.ts.
// Zero changes required outside lib/.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Re-export existing adapter interfaces for a single import point ───────────
export type { AuthAdapter, AuthAdapterUser } from "@/lib/auth/adapter";
export type { DbAdapter, RealtimeAdapter, DbDocument, QueryOptions, QueryResult } from "@/lib/db/adapter";
export type { StorageAdapter } from "@/lib/storage/adapter";

// ─────────────────────────────────────────────────────────────────────────────
// Domain repository contracts
// Each interface maps to a Firestore collection (or equivalent in another DB).
// ─────────────────────────────────────────────────────────────────────────────

// ── User ─────────────────────────────────────────────────────────────────────

export interface PublicProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  username: string | null;
  bio: string | null;
  createdAt: number;
  isVerified: boolean;
}

export interface UserStats {
  totalScans: number;
  reportsSubmitted: number;
  trustScore: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

export interface UserRepository {
  getProfile(uid: string): Promise<PublicProfile | null>;
  updateProfile(uid: string, updates: Partial<PublicProfile>): Promise<void>;
  getStats(uid: string): Promise<UserStats | null>;
  deleteAccount(uid: string): Promise<void>;
  /** Reserve a username atomically. Returns false if already taken. */
  claimUsername(uid: string, username: string): Promise<boolean>;
}

// ── Scan History ─────────────────────────────────────────────────────────────

export interface ScanRecord {
  id: string;
  userId: string;
  content: string;
  contentType: string;
  qrCodeId: string | null;
  scannedAt: number;
  deletedAt?: number | null;
}

export interface ScanRepository {
  record(scan: Omit<ScanRecord, "id">): Promise<string>;
  getPaginated(
    userId: string,
    pageSize: number,
    cursor?: any
  ): Promise<{ items: ScanRecord[]; cursor: any }>;
  delete(userId: string, scanId: string): Promise<void>;
}

// ── QR Codes ─────────────────────────────────────────────────────────────────

export interface QrCodeData {
  id: string;
  content: string;
  contentType: string;
  ownerId: string | null;
  scanCount: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface QrRepository {
  getById(id: string): Promise<QrCodeData | null>;
  getOrCreate(content: string, ownerId?: string): Promise<QrCodeData>;
  updateActive(id: string, isActive: boolean): Promise<void>;
  /** Subscribe to live stat updates. Returns an unsubscribe function. */
  subscribeToStats(id: string, cb: (data: QrCodeData | null) => void): () => void;
}

// ── History ───────────────────────────────────────────────────────────────────

export interface HistoryItem {
  id: string;
  content: string;
  contentType: string;
  qrCodeId: string | null;
  scannedAt: number;
  source: "local" | "cloud" | "favorite";
}

export interface HistoryRepository {
  getRecent(userId: string, limit: number): Promise<HistoryItem[]>;
  delete(userId: string, itemId: string): Promise<void>;
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export interface FavoriteItem {
  id: string;
  content: string;
  contentType: string;
  qrCodeId: string | null;
  savedAt: number;
  label?: string;
}

export interface FavoritesRepository {
  getAll(userId: string): Promise<FavoriteItem[]>;
  add(userId: string, item: Omit<FavoriteItem, "id">): Promise<string>;
  remove(userId: string, itemId: string): Promise<void>;
  isFavorite(userId: string, content: string): Promise<boolean>;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface UserSettings {
  theme: "light" | "dark" | "system";
  language: string;
  notificationsEnabled: boolean;
  analyticsOptIn: boolean;
  privacyMode: boolean;
}

export interface SettingsRepository {
  get(userId: string): Promise<UserSettings | null>;
  update(userId: string, updates: Partial<UserSettings>): Promise<void>;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: "mention" | "follow" | "report" | "system";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: number;
  payload?: Record<string, any>;
}

export interface NotificationService {
  getAll(userId: string): Promise<Notification[]>;
  markRead(userId: string, notificationId: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  /** Subscribe to real-time notification updates. Returns unsubscribe fn. */
  subscribe(userId: string, cb: (items: Notification[]) => void): () => void;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface AnalyticsService {
  logEvent(name: string, params?: Record<string, any>): void;
  setUserId(uid: string | null): void;
  setUserProperty(name: string, value: string | null): void;
}

// ── Storage ───────────────────────────────────────────────────────────────────

export interface StorageRepository {
  uploadProfilePhoto(file: Blob | File, userId: string, oldUrl?: string | null): Promise<string>;
  deleteProfilePhoto(userId: string, photoUrl: string): Promise<void>;
  uploadQrLogo(file: Blob | File, qrId: string, oldUrl?: string | null): Promise<string>;
  uploadImage(file: Blob | File, folder: string, userId?: string): Promise<string>;
  deleteImage(url: string): Promise<void>;
}
