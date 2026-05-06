// ─── Scan Fraud Guard ──────────────────────────────────────────────────────────
// Strict 1-scan-per-user-per-QR-code deduplication.
//
// Multi-layer protection:
//  1. User deduplication    — Logged-in users: Firestore `users/{uid}/countedScans/{qrId}`
//                             (permanent, cross-device, 1 count per user ever).
//                             Guest users: AsyncStorage permanent flag per QR per device.
//
//  2. Owner scan separation — Owner scans stored in ownerScanCount, never inflating
//                             the public scanCount.
//
//  3. Velocity detection    — If global scans/min exceeds threshold the scan is still
//                             recorded but NOT counted (marked bot-suspect).
//
//  4. Statistical anomaly   — If scan growth is unnatural (e.g. 1 lakh in 1 hour)
//                             the QR is flagged and the count is frozen until review.
//
// The result:
//   allowed: true  → count this scan (increment scanCount)
//   allowed: false → still record the event, but do NOT increment the public counter
// ──────────────────────────────────────────────────────────────────────────────

import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, rtdb } from "../db/client";

// ── Constants ──────────────────────────────────────────────────────────────────
const VELOCITY_WINDOW_MS        = 60 * 1000;   // 1 minute window
const VELOCITY_THRESHOLD_PER_MIN = 30;          // >30 scans/min = suspicious
const ANOMALY_HOURLY_THRESHOLD  = 500;          // >500 in 1 hour = freeze score
const ANOMALY_WINDOW_MS         = 60 * 60 * 1000; // 1 hour

// ── Types ─────────────────────────────────────────────────────────────────────
export type ScanDenyReason =
  | "owner_scan"        // QR owner scanning their own code
  | "too_frequent"      // User/device already counted for this QR (lifetime dedup)
  | "velocity_exceeded" // Global >30 scans/min — bot suspected
  | "anomaly_detected"; // Unnatural growth curve — score frozen

export type ScanGuardResult =
  | { allowed: true;  reason: null;           ownerScan: false }
  | { allowed: false; reason: ScanDenyReason; ownerScan: boolean };

// ── Device-level deduplication (for guest/anonymous users) ────────────────────
// Stores a permanent flag — no time window. Once a device has been counted
// for a given QR code, it never counts again.

function deviceCountedKey(qrId: string): string {
  return `scan_counted_v2_${qrId}`;
}

async function isDeviceAlreadyCounted(qrId: string): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(deviceCountedKey(qrId));
    return val === "1";
  } catch {
    return false;
  }
}

async function markDeviceCounted(qrId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(deviceCountedKey(qrId), "1");
  } catch {}
}

// ── User-level deduplication (for logged-in users, cross-device) ───────────────
// Reads/writes `users/{userId}/countedScans/{qrId}` in Firestore.
// Returns true if the user has already been counted for this QR code.

async function isUserAlreadyCounted(userId: string, qrId: string): Promise<boolean> {
  try {
    const doc = await db.get(["users", userId, "countedScans", qrId]);
    return doc !== null;
  } catch {
    return false;
  }
}

async function markUserCounted(userId: string, qrId: string): Promise<void> {
  try {
    await db.set(["users", userId, "countedScans", qrId], {
      countedAt: db.timestamp(),
    });
  } catch {}
}

// ── Velocity helpers (uses existing RTDB qrScanVelocity) ──────────────────────
async function getRecentVelocity(qrId: string): Promise<number> {
  try {
    const raw: Record<string, { ts: number }> | null =
      await rtdb.get(`qrScanVelocity/${qrId}`);
    if (!raw) return 0;
    const now = Date.now();
    return Object.values(raw).filter((v) => now - v.ts < VELOCITY_WINDOW_MS).length;
  } catch {
    return 0;
  }
}

async function getRecentHourlyVolume(qrId: string): Promise<number> {
  try {
    const raw: Record<string, { ts: number }> | null =
      await rtdb.get(`qrScanVelocity/${qrId}`);
    if (!raw) return 0;
    const now = Date.now();
    return Object.values(raw).filter((v) => now - v.ts < ANOMALY_WINDOW_MS).length;
  } catch {
    return 0;
  }
}

// ── Anomaly freezer — marks QR as suspicious in Firestore ─────────────────────
async function maybeFreezeScanCount(qrId: string, hourlyVolume: number): Promise<boolean> {
  if (hourlyVolume < ANOMALY_HOURLY_THRESHOLD) return false;
  try {
    await db.update(["qrCodes", qrId], {
      scanCountFrozen: true,
      scanCountFrozenAt: db.timestamp(),
      scanCountFreezeReason: `Anomaly: ${hourlyVolume} scans in 1 hour`,
    });
    console.warn(`[ScanGuard] ANOMALY: QR ${qrId} frozen — ${hourlyVolume} scans/hr`);
    return true;
  } catch {
    return false;
  }
}

// ── Main guard function ───────────────────────────────────────────────────────
export async function checkScanAllowed(
  qrId: string,
  userId: string | null,
  qrOwnerId: string | null | undefined
): Promise<ScanGuardResult> {
  // 1. Owner scan — always separate, never inflate public count
  if (userId && qrOwnerId && userId === qrOwnerId) {
    return { allowed: false, reason: "owner_scan", ownerScan: true };
  }

  // 2. Per-user or per-device lifetime deduplication
  //    Logged-in users: check Firestore (cross-device, permanent)
  //    Guest users: check AsyncStorage (device-only, permanent)
  if (userId) {
    const alreadyCounted = await isUserAlreadyCounted(userId, qrId);
    if (alreadyCounted) {
      return { allowed: false, reason: "too_frequent", ownerScan: false };
    }
  } else {
    const alreadyCounted = await isDeviceAlreadyCounted(qrId);
    if (alreadyCounted) {
      return { allowed: false, reason: "too_frequent", ownerScan: false };
    }
  }

  // 3. Velocity check and anomaly detection
  const [velocityCount, hourlyVolume] = await Promise.all([
    getRecentVelocity(qrId),
    getRecentHourlyVolume(qrId),
  ]);

  // 4. Anomaly detection — freeze trust score if growth is unnatural
  if (hourlyVolume >= ANOMALY_HOURLY_THRESHOLD) {
    await maybeFreezeScanCount(qrId, hourlyVolume);
    return { allowed: false, reason: "anomaly_detected", ownerScan: false };
  }

  // 5. Velocity gate — global burst protection
  if (velocityCount >= VELOCITY_THRESHOLD_PER_MIN) {
    return { allowed: false, reason: "velocity_exceeded", ownerScan: false };
  }

  // ✅ Allowed — permanently mark this user/device as counted so future
  //    attempts are blocked regardless of source (camera, gallery, or viewed).
  if (userId) {
    await markUserCounted(userId, qrId);
  } else {
    await markDeviceCounted(qrId);
  }

  return { allowed: true, reason: null, ownerScan: false };
}

// ── Owner scan recorder ───────────────────────────────────────────────────────
// Tracks owner's own scans in a separate counter — visible in their analytics
// but invisible to the public scanCount.
export async function recordOwnerScan(qrId: string, userId: string): Promise<void> {
  try {
    await Promise.all([
      db.increment(["qrCodes", qrId], "ownerScanCount", 1),
      db.add(["users", userId, "ownerScans"], {
        qrCodeId: qrId,
        scannedAt: db.timestamp(),
      }),
    ]);
  } catch {}
}

// ── Blocked scan logger ────────────────────────────────────────────────────────
// Records that a scan was blocked (for analytics / grant reporting).
// Does NOT affect public counters.
export async function recordBlockedScan(
  qrId: string,
  reason: ScanDenyReason,
  userId: string | null
): Promise<void> {
  try {
    await rtdb.push(`blockedScans/${qrId}`, {
      ts: Date.now(),
      reason,
      uid: userId ?? "guest",
    });
  } catch {}
}
