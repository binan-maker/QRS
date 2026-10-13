import { db } from "@/lib/db/client";
import { checkCommentReportEligibility, recordCommentReport } from "../integrity";
import { COLLECTIONS } from "@/shared/constants/collections";

export async function reportComment(
  qrId: string,
  commentId: string,
  userId: string,
  reason: string,
  emailVerified: boolean = false
): Promise<void> {
  await checkCommentReportEligibility(userId, emailVerified);

  const reportPath = [COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS, commentId, COLLECTIONS.REPORTS, userId];
  const commentPath = [COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS, commentId];

  await db.set(reportPath, { reason, createdAt: db.timestamp(), userId });

  try {
    const { docs } = await db.query([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.COMMENTS, commentId, COLLECTIONS.REPORTS]);
    const reportCount = docs.length;
    await db.update(commentPath, { reportCount });
  } catch {}

  await recordCommentReport(userId);
}