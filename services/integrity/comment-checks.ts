import { db } from "@/lib/db/client";
import { tsToMs, isWithin24h } from "./time-utils";

export async function checkCommentEligibility(
  userId: string,
  qrId: string,
  emailVerified: boolean,
  commentText: string
): Promise<void> {
  if (!commentText || commentText.trim().length < 3) {
    throw new Error("Comment is too short. Please write at least 3 characters.");
  }
  if (commentText.trim().length > 500) {
    throw new Error("Comment is too long. Maximum 500 characters allowed.");
  }
}

export async function recordComment(userId: string): Promise<void> {
  try {
    const userData = await db.get(["users", userId]);
    const windowStart = tsToMs(userData?.commentRateWindowStart);
    const count = userData?.commentRateCount || 0;

    if (isWithin24h(windowStart)) {
      await db.update(["users", userId], {
        commentRateCount: count + 1,
        lastCommentAt: db.timestamp(),
      });
    } else {
      await db.update(["users", userId], {
        commentRateWindowStart: db.timestamp(),
        commentRateCount: 1,
        lastCommentAt: db.timestamp(),
      });
    }
  } catch {}
}

export async function checkCommentReportEligibility(
  userId: string,
  emailVerified: boolean
): Promise<void> {}

export async function recordCommentReport(userId: string): Promise<void> {
  try {
    const userData = await db.get(["users", userId]);
    const windowStart = tsToMs(userData?.commentReportRateWindowStart);
    const count = userData?.commentReportRateCount || 0;

    if (isWithin24h(windowStart)) {
      await db.update(["users", userId], { commentReportRateCount: count + 1 });
    } else {
      await db.update(["users", userId], {
        commentReportRateWindowStart: db.timestamp(),
        commentReportRateCount: 1,
      });
    }
  } catch {}
}
