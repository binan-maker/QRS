import { isWithin24h, formatTimeRemaining, timeUntilWindowReset } from "./time-utils";
import { getAccountTier } from "./tiers";

const MAX_COMMENT_RATE_ENTRIES = 200;

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
    if (commentRateMap.size >= MAX_COMMENT_RATE_ENTRIES) {
      const oldestKey = commentRateMap.keys().next().value;
      if (oldestKey) commentRateMap.delete(oldestKey);
    }
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
  _qrId: string,
  emailVerified: boolean,
  commentText: string
): Promise<void> {
  if (!commentText || commentText.trim().length < 3) {
    throw new Error("Comment is too short. Please write at least 3 characters.");
  }
  if (commentText.trim().length > 500) {
    throw new Error("Comment is too long. Maximum 500 characters allowed.");
  }

  if (userId) {
    const tier = await getAccountTier(userId, emailVerified);
    const state = getRateState(userId);
    if (tier.maxCommentsPerDay !== Infinity) {
      if (isWithin24h(state.commentWindowStart) && state.commentCount >= tier.maxCommentsPerDay) {
        const timeRemaining = formatTimeRemaining(timeUntilWindowReset(state.commentWindowStart));
        throw new Error(
          `You've reached your daily comment limit (${tier.maxCommentsPerDay}). Please try again in ${timeRemaining}.`
        );
      }
    }
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
): Promise<void> {
  if (userId) {
    const tier = await getAccountTier(userId, emailVerified);
    const state = getRateState(userId);
    if (tier.maxCommentReportsPerDay !== Infinity) {
      if (isWithin24h(state.reportWindowStart) && state.reportCount >= tier.maxCommentReportsPerDay) {
        const timeRemaining = formatTimeRemaining(timeUntilWindowReset(state.reportWindowStart));
        throw new Error(
          `You've reached your daily comment report limit (${tier.maxCommentReportsPerDay}). Please try again in ${timeRemaining}.`
        );
      }
    }
  }
}

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
