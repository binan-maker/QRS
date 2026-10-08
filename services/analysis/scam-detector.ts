export interface ScamDetectionResult {
  hasScamSignals: boolean;
  score: number;
  signals: string[];
  recommendations: string[];
}

export function detectScamSignals(content: string): ScamDetectionResult {
  const lower = (content || "").toLowerCase();
  const signals: string[] = [];

  const scamKeywords = [
    "lottery", "winner", "prize", "urgent", "verify account",
    "password", "wire transfer", "gift card", "crypto double",
    "free bitcoin", "login now", "suspicious activity"
  ];

  for (const kw of scamKeywords) {
    if (lower.includes(kw)) {
      signals.push(`Contains high-risk trigger word: "${kw}"`);
    }
  }

  const hasScamSignals = signals.length > 0;
  const score = Math.max(0, 100 - signals.length * 30);

  return {
    hasScamSignals,
    score,
    signals,
    recommendations: hasScamSignals
      ? ["Do not enter sensitive details or transfer money", "Verify the official website independently"]
      : ["No obvious scam signals detected"],
  };
}
