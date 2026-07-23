import { db } from "@/lib/db/client";
import { checkCommentReportEligibility, recordCommentReport } from "../integrity";
import { COLLECTIONS } from "@/shared/constants/collections";

const SOFT_DELETE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function reportComment(
  qrId: string,
  commentId: string,
  userId: string,
  reason: string,
  emailVerified: boolean = false
): Promise<void> {
  await checkCommentReportEligibility(userId, emailVerified);

  const reportPath  = [COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS, commentId, COLLECTIONS.REPORTS, userId];
  const commentPath = [COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS, commentId];

  await db.set(reportPath, { reason, createdAt: db.timestamp(), userId });

  try {
    const commentData = await db.get(commentPath);
    await db.add([COLLECTIONS.MODERATION_QUEUE], {
      type: "comment_report",
      qrCodeId: qrId, commentId,
      reportedByUserId: userId, reason,
      commentText: commentData?.text || "",
      commentAuthorId: commentData?.userId || "",
      commentAuthorName: commentData?.userDisplayName || "Unknown",
      status: "pending",
      createdAt: db.timestamp(),
    });
  } catch {}

  try {
    const { docs } = await db.query([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS, commentId, COLLECTIONS.REPORTS]);
    const reportCount = docs.length;
    await db.update(commentPath, { reportCount });
    if (reportCount >= 3) await db.update(commentPath, { isHidden: true });
  } catch {}

  await recordCommentReport(userId);
}

export async function ownerHideComment(qrId: string, commentId: string): Promise<void> {
  try {
    await db.update([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS, commentId], { isHidden: true });
  } catch (e) {
    console.warn("[db] ownerHideComment failed:", e);
    throw e;
  }
}

// NOTE: Comments live at qrCodes/{qrId}/comments/{commentId} — there is no
// root-level "comments" collection to query. This function performs per-QR
// cleanup scoped to a specific QR code instead of a cross-collection scan.
export async function hardDeleteOldSoftDeletes(
  options: { qrId?: string; batchSize?: number } = {}
): Promise<{ deletedCount: number; hasMore: boolean }> {
  if (!options.qrId) {
    // No qrId provided — nothing to clean up without a collection group query.
    return { deletedCount: 0, hasMore: false };
  }

  const now = Date.now();
  const batchSize = options.batchSize || 100;
  let totalDeleted = 0;

  try {
    const { docs } = await db.query([COLLECTIONS.QR_CODES, options.qrId, COLLECTIONS.COMMENTS], {
      where: [{ field: "isDeleted", op: "==", value: true }],
      orderBy: { field: "deletedAt", direction: "asc" },
      limit: batchSize,
    });

    const toDelete: string[] = [];
    let hasMore = false;

    for (const d of docs) {
      const deletedAt = d.data.deletedAt;
      let deletedAtMs = 0;
      if (deletedAt && typeof deletedAt === "object" && "toDate" in deletedAt) {
        deletedAtMs = (deletedAt as any).toDate().getTime();
      } else if (typeof deletedAt === "string") {
        deletedAtMs = new Date(deletedAt).getTime();
      }
      if (deletedAtMs > 0 && now - deletedAtMs > SOFT_DELETE_TTL_MS) {
        toDelete.push(d.id);
      }
    }

    hasMore = docs.length >= batchSize;

    await Promise.all(
      toDelete.map(id => db.delete([COLLECTIONS.QR_CODES, options.qrId!, COLLECTIONS.COMMENTS, id]).catch(() => {}))
    );
    totalDeleted = toDelete.length;

    return { deletedCount: totalDeleted, hasMore };
  } catch (e) {
    console.error("[cleanup] hardDeleteOldSoftDeletes failed:", e);
    return { deletedCount: 0, hasMore: false };
  }
}