import { isWithin24h } from "./time-utils";

interface CommentRateState {
  commentWindowStart: number;
  commentCount: number;
  reportWindowStart: number;
  reportCount: number;
}

const commentRateMap = new Map<string, CommentRateState>();

function getRateState(userId: string): CommentRateState {
  let state = commentRateMap.get(userId);
  if (!state) {
    state = {
      commentWindowStart: 0,
      commentCount: 0,
      reportWindowStart: 0,
      reportCount: 0,
    };
    commentRateMap.set(userId, state);
  }
  return state;
}

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
  const state = getRateState(userId);
  const now = Date.now();
  if (isWithin24h(state.commentWindowStart)) {
    state.commentCount += 1;
  } else {
    state.commentWindowStart = now;
    state.commentCount = 1;
  }
}

export async function checkCommentReportEligibility(
  userId: string,
  emailVerified: boolean
): Promise<void> {}

export async function recordCommentReport(userId: string): Promise<void> {
  const state = getRateState(userId);
  const now = Date.now();
  if (isWithin24h(state.reportWindowStart)) {
    state.reportCount += 1;
  } else {
    state.reportWindowStart = now;
    state.reportCount = 1;
  }
}
