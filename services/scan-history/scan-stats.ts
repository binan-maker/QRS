import { db } from "@/lib/db/client";
import { COLLECTIONS } from "@/shared/constants/collections";

export interface ScanStatsResult {
  total: number;
}

export async function getUserScanStats(userId: string): Promise<ScanStatsResult> {
  try {
    const userDoc = await db.get([COLLECTIONS.USERS, userId]);
    const userData = userDoc?.data || userDoc || {};
    const totalScans = userData.scanCount ?? userData.personalScanCount;

    if (totalScans !== undefined) {
      return { total: totalScans || 0 };
    }
  } catch (e) {
    console.warn("Failed to fetch user stats:", e);
  }

  return { total: 0 };
}

export async function getUserAllScansForStats(
  userId: string
): Promise<Array<{ id: string; content: string; contentType: string }>> {
  const allScans: Array<{ id: string; content: string; contentType: string }> = [];
  let cursor: any = undefined;

  do {
    const { docs, cursor: nextCursor } = await db.query(
      [COLLECTIONS.USERS, userId, COLLECTIONS.SCANS],
      {
        orderBy: { field: "scannedAt", direction: "desc" },
        limit: 500,
        cursor,
      }
    );
    cursor = nextCursor;

    const filtered = docs
      .filter((d) => d.data.isDeleted !== true)
      .map((d) => ({
        id: d.id,
        content: d.data.content ?? "",
        contentType: d.data.contentType ?? "text",
      }));

    allScans.push(...filtered);

    if (allScans.length >= 2000) break;
  } while (cursor);

  return allScans;
}
