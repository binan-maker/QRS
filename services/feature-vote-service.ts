import { db } from "@/lib/db/client";

export type FeatureVoteChoice = "need" | "not_need";

function voteKey(email: string): string {
  return email.trim().toLowerCase();
}

export async function getFeatureVote(email: string): Promise<FeatureVoteChoice | null> {
  if (!email) return null;
  const data = await db.get(["featureVotes", voteKey(email)]);
  return (data?.vote as FeatureVoteChoice) ?? null;
}

/**
 * Casts a single vote for the given email. Enforces one-vote-per-email by
 * checking for an existing record before writing (mirrors the check-then-set
 * pattern already used by services/user/favorites.ts). Returns false if the
 * email has already voted (no-op).
 */
export async function castFeatureVote(
  email: string,
  vote: FeatureVoteChoice,
): Promise<boolean> {
  if (!email) return false;
  const key = voteKey(email);
  const existing = await db.get(["featureVotes", key]);
  if (existing) return false;
  await db.set(["featureVotes", key], {
    email: key,
    vote,
    votedAt: db.timestamp(),
  });
  return true;
}
