// ─── Distributed Counter Utility ──────────────────────────────────────────────
// Solves the "Hot Document" problem: When a QR code goes viral (1000+ scans/sec),
// writing to a single Firestore document will fail (1 write/sec limit per doc).
//
// Solution: Use distributed counters (sharding) across N shards.
// - Each increment writes to a random shard
// - Total count = sum of all shards
// - Increases write capacity by N x (e.g., 10 shards = 10 writes/sec)
//
// Reference: https://firebase.google.com/docs/firestore/solutions/counters

import { db } from "../client";

const NUM_SHARDS = 10; // Adjust based on expected peak load (10 = ~10 writes/sec)

/**
 * Get a random shard ID for distributing writes
 */
function getRandomShardId(): number {
  return Math.floor(Math.random() * NUM_SHARDS);
}

/**
 * Increment a distributed counter
 * @param qrId - The QR code ID
 * @param delta - Amount to increment (default: 1)
 */
export async function incrementDistributedCounter(
  qrId: string,
  delta: number = 1
): Promise<void> {
  const shardId = getRandomShardId();
  try {
    await db.increment(["qrCodes", qrId, "counters", `shard-${shardId}`], "count", delta);
  } catch (e) {
    console.warn("[db] incrementDistributedCounter failed:", e);
  }
}

/**
 * Get the total count from all shards
 * This is more expensive (N reads) so use sparingly
 * @param qrId - The QR code ID
 * @returns Total count across all shards
 */
export async function getDistributedCounter(qrId: string): Promise<number> {
  try {
    const shardPromises: Promise<number>[] = [];
    
    for (let i = 0; i < NUM_SHARDS; i++) {
      shardPromises.push(
        db.get(["qrCodes", qrId, "counters", `shard-${i}`])
          .then(data => data?.count ?? 0)
          .catch(() => 0)
      );
    }
    
    const results = await Promise.all(shardPromises);
    return results.reduce((sum, count) => sum + count, 0);
  } catch (e) {
    console.warn("[db] getDistributedCounter failed:", e);
    return 0;
  }
}

/**
 * Migrate existing scanCount to distributed counters
 * Call this once during deployment for existing QR codes
 * @param qrId - The QR code ID
 * @param currentCount - The current scanCount value
 */
export async function migrateToDistributedCounter(
  qrId: string,
  currentCount: number
): Promise<void> {
  if (currentCount === 0) return;
  
  // Distribute the count evenly across shards
  const perShard = Math.floor(currentCount / NUM_SHARDS);
  const remainder = currentCount % NUM_SHARDS;
  
  const updates: Promise<void>[] = [];
  
  for (let i = 0; i < NUM_SHARDS; i++) {
    const shardValue = perShard + (i < remainder ? 1 : 0);
    if (shardValue > 0) {
      updates.push(
        db.set(["qrCodes", qrId, "counters", `shard-${i}`], { count: shardValue })
      );
    }
  }
  
  try {
    await Promise.all(updates);
    console.log(`[migration] Migrated ${currentCount} scans to ${NUM_SHARDS} shards for QR ${qrId}`);
  } catch (e) {
    console.error("[migration] migrateToDistributedCounter failed:", e);
  }
}

/**
 * Hybrid approach: Use direct increment for low-traffic QRs,
 * distributed counters for high-traffic QRs
 * @param qrId - The QR code ID
 * @param currentScanCount - Current scan count to determine strategy
 * @param delta - Amount to increment
 */
export async function incrementSmartCounter(
  qrId: string,
  currentScanCount: number,
  delta: number = 1
): Promise<void> {
  // Threshold: Switch to distributed counters after 1000 scans
  // or if we detect high velocity (could add RTDB velocity check here)
  const DISTRIBUTED_THRESHOLD = 1000;
  
  if (currentScanCount >= DISTRIBUTED_THRESHOLD) {
    await incrementDistributedCounter(qrId, delta);
  } else {
    // For low-traffic QRs, use simple direct increment
    try {
      await db.increment(["qrCodes", qrId], "scanCount", delta);
    } catch (e) {
      console.warn("[db] incrementSmartCounter fallback failed:", e);
      // Fallback to distributed if direct fails
      await incrementDistributedCounter(qrId, delta);
    }
  }
}
