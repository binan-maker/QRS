import { db } from "@/lib/db/client";
import { COLLECTIONS } from "@/shared/constants/collections";

export interface ScanStatsResult {
  total: number;
  byUrl: number;
  byText: number;
  byPayment: number;
  byOther: number;
}

export async function getUserScanStats(userId: string): Promise<ScanStatsResult> {
  try {
    const userDoc = await db.get([COLLECTIONS.USERS, userId]);
    const userData = userDoc?.data || {};

    if (userData.personalScanCount !== undefined) {
      return {
        total: userData.personalScanCount || 0,
        byUrl: userData.scanCountByUrl || 0,
        byText: userData.scanCountByText || 0,
        byPayment: userData.scanCountByPayment || 0,
        byOther: (userData.personalScanCount || 0) -
                 ((userData.scanCountByUrl || 0) +
                  (userData.scanCountByText || 0) +
                  (userData.scanCountByPayment || 0)),
      };
    }
  } catch (e) {
    console.warn("Failed to fetch user stats, falling back to query:", e);
  }

  let total = 0, byUrl = 0, byText = 0, byPayment = 0, byOther = 0;
  let cursor: any = undefined;

  do {
    const { docs, cursor: nextCursor } = await db.query([COLLECTIONS.USERS, userId, COLLECTIONS.SCANS], {
      limit: 1000,
      cursor,
    });
    cursor = nextCursor;

    for (const d of docs) {
      const data = d.data;
      total++;

      if (data.contentType === "url") byUrl++;
      else if (data.contentType === "text") byText++;
      else if (data.contentType === "payment") byPayment++;
      else byOther++;
    }
  } while (cursor);

  return { total, byUrl, byText, byPayment, byOther };
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
