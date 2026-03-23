import { useEffect, useMemo, useState } from "react";
import {
  BUILT_IN_BLACKLIST,
  checkOfflineBlacklist,
  loadOfflineBlacklist,
  parseAnyPaymentQr,
  analyzeAnyPaymentQr,
  analyzeUrlHeuristics,
  type ParsedPaymentQr,
  type PaymentSafetyResult,
  type UrlSafetyResult,
} from "@/lib/qr-analysis";

export type VerdictLevel = "safe" | "caution" | "dangerous" | "unknown";

export interface InstantVerdict {
  level: VerdictLevel;
  reason: string | null;
}

export function computeInstantVerdict(
  content: string | null | undefined,
  contentType: string | null | undefined
): InstantVerdict {
  if (!content) return { level: "unknown", reason: null };

  const blMatch = checkOfflineBlacklist(content, BUILT_IN_BLACKLIST);
  if (blMatch.matched) return { level: "dangerous", reason: blMatch.reason };

  if (contentType === "url") {
    try {
      const result = analyzeUrlHeuristics(content);
      if (result.isSuspicious) {
        return {
          level: result.riskLevel === "dangerous" ? "dangerous" : "caution",
          reason: result.warnings[0] ?? null,
        };
      }
    } catch {}
  }

  if (contentType === "payment") {
    try {
      const parsed = parseAnyPaymentQr(content);
      if (parsed) {
        const safety = analyzeAnyPaymentQr(parsed);
        if (safety.isSuspicious) {
          return {
            level: safety.riskLevel === "dangerous" ? "dangerous" : "caution",
            reason: safety.warnings[0] ?? null,
          };
        }
      }
    } catch {}
  }

  return { level: "safe", reason: null };
}

export function useQrSafety(content: string | null | undefined, contentType: string | null | undefined) {
  const [parsedPayment, setParsedPayment] = useState<ParsedPaymentQr | null>(null);
  const [paymentSafety, setPaymentSafety] = useState<PaymentSafetyResult | null>(null);
  const [urlSafety, setUrlSafety] = useState<UrlSafetyResult | null>(null);
  const [offlineBlacklistMatch, setOfflineBlacklistMatch] = useState<{ matched: boolean; reason: string | null }>({ matched: false, reason: null });

  const instantVerdict = useMemo(() => computeInstantVerdict(content, contentType), [content, contentType]);

  useEffect(() => {
    if (!content) return;
    (async () => {
      const blacklist = await loadOfflineBlacklist();
      const blMatch = checkOfflineBlacklist(content, blacklist);
      setOfflineBlacklistMatch(blMatch);
      if (contentType === "payment") {
        const parsed = parseAnyPaymentQr(content);
        if (parsed) {
          setParsedPayment(parsed);
          setPaymentSafety(analyzeAnyPaymentQr(parsed));
        }
      }
      if (contentType === "url") {
        try {
          const result = analyzeUrlHeuristics(content);
          setUrlSafety(result);
        } catch {}
      }
    })();
  }, [content, contentType]);

  return { parsedPayment, paymentSafety, urlSafety, offlineBlacklistMatch, instantVerdict };
}
