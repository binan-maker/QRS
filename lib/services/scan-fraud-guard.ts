// ─── Scan Fraud Guard ──────────────────────────────────────────────────────────
// YouTube-style scan counting fraud prevention.
//
// Multi-layer protection:
//  1. Device deduplication   — AsyncStorage tracks scans per device per QR.
//                              Max 4 counted scans per device per 24 hours.
//                              (Like YouTube's cookie/fingerprint tracking)
//
//  2. Owner scan separation  — Owner scans are stored in ownerScanCount, never
//                              inflating the public scanCount.
//
//  3. Velocity detection     — If global scans/min exceeds threshold the scan is
//                              still recorded but NOT counted (marked bot-suspect).
//
//  4. Statistical anomaly    — If the scan growth curve is unnatural (e.g. 1 lakh
//                              scans in 1 hour) the QR is flagged and the trust
//                              score is frozen until human review.
//
// The result:
//   allowed: true  → count this scan (increment scanCount)
//   allowed: false → still record the event, but do NOT increment the public counter
// ──────────────────────────────────────────────────────────────────────────────

import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, rtdb } from "../db/client";

// ── Constants ──────────────────────────────────────────────────────────────────
const MAX_DEVICE_SCANS_PER_WINDOW   = 4;          // Like YouTube's 4-5/24h rule
const DEVICE_WINDOW_MS              = 24 * 60 * 60 * 1000; // 24 hours
const VELOCITY_WINDOW_MS            = 60 * 1000;  // 1 minute window
const VELOCITY_THRESHOLD_PER_MIN    = 30;          // >30 scans/min = suspicious
const ANOMALY_HOURLY_THRESHOLD      = 500;         // >500 in 1 hour = freeze score
const ANOMALY_WINDOW_MS             = 60 * 60 * 1000; // 1 hour

// ── Types ─────────────────────────────────────────────────────────────────────
export type ScanDenyReason =
  | "owner_scan"        // QR owner scanning their own code
  | "too_frequent"      // Same device exceeded 4/24h limit
  | "velocity_exceeded" // Global >30 scans/min — bot suspected
  | "anomaly_detected"; // Unnatural growth curve — score frozen

export type ScanGuardResult =
  | { allowed: true;  reason: null;           ownerScan: false }
  | { allowed: false; reason: ScanDenyReason; ownerScan: boolean };

interface DeviceScanRecord {
  timestamps: number[];
}

// ── Device deduplication helpers ───────────────────────────────────────────────
function deviceKey(qrId: string): string {
  return `scan_guard_v1_${qrId}`;
}

async function getDeviceRecord(qrId: string): Promise<DeviceScanRecord> {
  try {
    const raw = await AsyncStorage.getItem(deviceKey(qrId));
    return raw ? JSON.parse(raw) : { timestamps: [] };
  } catch {
    return { timestamps: [] };
  }
}

async function recordDeviceTimestamp(qrId: string): Promise<void> {
  try {
    const now = Date.now();
    const record = await getDeviceRecord(qrId);
    const pruned = record.timestamps.filter((t) => now - t < DEVICE_WINDOW_MS);
    pruned.push(now);
    await AsyncStorage.setItem(deviceKey(qrId), JSON.stringify({ timestamps: pruned }));
  } catch {}
}

async function getDeviceCountInWindow(qrId: string): Promise<number> {
  const now = Date.now();
  const record = await getDeviceRecord(qrId);
  return record.timestamps.filter((t) => now - t < DEVICE_WINDOW_MS).length;
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

  // 2. Velocity check — run in parallel with device check
  const [velocityCount, hourlyVolume, deviceCount] = await Promise.all([
    getRecentVelocity(qrId),
    getRecentHourlyVolume(qrId),
    getDeviceCountInWindow(qrId),
  ]);

  // 3. Anomaly detection — freeze trust score if growth is unnatural
  if (hourlyVolume >= ANOMALY_HOURLY_THRESHOLD) {
    await maybeFreezeScanCount(qrId, hourlyVolume);
    return { allowed: false, reason: "anomaly_detected", ownerScan: false };
  }

  // 4. Velocity gate — global burst protection
  if (velocityCount >= VELOCITY_THRESHOLD_PER_MIN) {
    return { allowed: false, reason: "velocity_exceeded", ownerScan: false };
  }

  // 5. Device deduplication — same device limit (YouTube 4-5/24h rule)
  if (deviceCount >= MAX_DEVICE_SCANS_PER_WINDOW) {
    return { allowed: false, reason: "too_frequent", ownerScan: false };
  }

  // ✅ Allowed — record the device timestamp so future checks see it
  await recordDeviceTimestamp(qrId);
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

// ── Device scan count inspector (for debug / analytics UI) ───────────────────
export async function getDeviceScanCountToday(qrId: string): Promise<number> {
  return getDeviceCountInWindow(qrId);
}
