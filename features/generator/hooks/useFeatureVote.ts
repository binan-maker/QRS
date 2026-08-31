import { useState, useEffect, useCallback } from "react";
import {
  getFeatureVote,
  castFeatureVote,
  type FeatureVoteChoice,
} from "@/services/votes/feature-vote-service";

export function useFeatureVote(email: string | null | undefined) {
  const [vote,       setVote]       = useState<FeatureVoteChoice | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!email) {
      setVote(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getFeatureVote(email)
      .then((v) => { if (!cancelled) setVote(v); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [email]);

  const submitVote = useCallback(async (choice: FeatureVoteChoice) => {
    if (!email || vote || submitting) return;
    setSubmitting(true);
    try {
      const didVote = await castFeatureVote(email, choice);
      if (didVote) {
        setVote(choice);
      } else {
        // Someone already voted with this email — reflect the existing vote.
        const latest = await getFeatureVote(email);
        setVote(latest);
      }
    } finally {
      setSubmitting(false);
    }
  }, [email, vote, submitting]);

  return { vote, loading, submitting, hasVoted: !!vote, submitVote };
}
