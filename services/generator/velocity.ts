import { db } from "@/lib/db/client";
import type { ScanVelocityBucket } from "../types";

export type { ScanVelocityBucket };

export async function getScanVelocity(qrId: string): Promise<ScanVelocityBucket[]> {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  const buckets: ScanVelocityBucket[] = Array.from({ length: 24 }, (_, i) => {
    const h = new Date(cutoff + i * 60 * 60 * 1000);
    const hour = h.getHours();
    const label = hour === 0 ? "12a" : hour < 12 ? `${hour}a` : hour === 12 ? "12p" : `${hour - 12}p`;
    return { hour: i, label, count: 0 };
  });
  try {
    // Read scan velocity events from Firestore (unified storage, no RTDB dependency).
    const { docs } = await db.query(["qrCodes", qrId, "scanVelocity"], {
      where: [{ field: "ts", op: ">=", value: cutoff }],
      orderBy: { field: "ts", direction: "asc" },
    });
    for (const d of docs) {
      const ts: number = d.data.ts;
      if (ts >= cutoff) {
        const bucketIdx = Math.floor((ts - cutoff) / (60 * 60 * 1000));
        if (bucketIdx >= 0 && bucketIdx < 24) buckets[bucketIdx].count++;
      }
    }
  } catch {
    // Permission denied or network error — return empty buckets silently.
  }
  return buckets;
}
