import { db } from "@/lib/db/client";
import { checkCommentReportEligibility, recordCommentReport } from "../integrity-service";

const SOFT_DELETE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function reportComment(
  qrId: string,
  commentId: string,
  userId: string,
  reason: string,
  emailVerified: boolean = false
): Promise<void> {
  await checkCommentReportEligibility(userId, emailVerified);

  const reportPath  = ["qrCodes", qrId, "comments", commentId, "reports", userId];
  const commentPath = ["qrCodes", qrId, "comments", commentId];

  await db.set(reportPath, { reason, createdAt: db.timestamp(), userId });

  try {
    const commentData = await db.get(commentPath);
    await db.add(["moderationQueue"], {
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
    const { docs } = await db.query(["qrCodes", qrId, "comments", commentId, "reports"]);
    const reportCount = docs.length;
    await db.update(commentPath, { reportCount });
    if (reportCount >= 3) await db.update(commentPath, { isHidden: true });
  } catch {}

  await recordCommentReport(userId);
}

export async function ownerHideComment(qrId: string, commentId: string): Promise<void> {
  try {
    await db.update(["qrCodes", qrId, "comments", commentId], { isHidden: true });
  } catch (e) {
    console.warn("[db] ownerHideComment failed:", e);
    throw e;
  }
}

export async function hardDeleteOldSoftDeletes(
  options: { batchSize?: number; maxQrCodes?: number; continuationToken?: string } = {}
): Promise<{ deletedCount: number; continuationToken?: string; hasMore: boolean }> {
  const now = Date.now();
  const batchSize = options.batchSize || 500;
  let totalDeleted = 0;

  try {
    const { docs: deletedComments } = await db.query(["comments"], {
      where: [{ field: "isDeleted", op: "==", value: true }],
      orderBy: { field: "deletedAt", direction: "asc" },
      limit: batchSize,
      cursor: options.continuationToken ? { startAt: [options.continuationToken] } : undefined,
    });

    const toDeleteByQr: Map<string, string[]> = new Map();
    let cutoffReached = false;

    for (const d of deletedComments) {
      const deletedAt = d.data.deletedAt;
      let deletedAtMs = 0;
      if (deletedAt && typeof deletedAt === "object" && "toDate" in deletedAt) {
        deletedAtMs = (deletedAt as any).toDate().getTime();
      } else if (deletedAt && typeof deletedAt === "string") {
        deletedAtMs = new Date(deletedAt).getTime();
      }

      if (deletedAtMs > 0 && now - deletedAtMs <= SOFT_DELETE_TTL_MS) {
        cutoffReached = true;
        break;
      }

      if (deletedAtMs > 0 && now - deletedAtMs > SOFT_DELETE_TTL_MS) {
        const qrId = d.data.qrCodeId || d.data.parentId;
        if (qrId) {
          if (!toDeleteByQr.has(qrId)) toDeleteByQr.set(qrId, []);
          toDeleteByQr.get(qrId)!.push(d.id);
        }
      }
    }

    const deletePromises: Promise<void>[] = [];
    for (const [qrId, commentIds] of toDeleteByQr.entries()) {
      for (let i = 0; i < commentIds.length; i += 500) {
        const batch = commentIds.slice(i, i + 500);
        deletePromises.push(
          Promise.all(batch.map(id => db.delete(["qrCodes", qrId, "comments", id]).catch(() => {}))).then(() => {})
        );
      }
      totalDeleted += commentIds.length;
    }

    await Promise.all(deletePromises);

    const hasMore = !cutoffReached && deletedComments.length >= batchSize;
    const nextToken = hasMore && deletedComments.length > 0
      ? deletedComments[deletedComments.length - 1].id
      : undefined;

    return { deletedCount: totalDeleted, continuationToken: nextToken, hasMore };
  } catch (e) {
    console.error("[cleanup] hardDeleteOldSoftDeletes failed:", e);
    return { deletedCount: totalDeleted, hasMore: false };
  }
}
