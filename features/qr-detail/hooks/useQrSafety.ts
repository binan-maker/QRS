import { useEffect, useState } from "react";
import {
  parseAnyPaymentQr,
  analyzeAnyPaymentQr,
  analyzeUrlHeuristics,
  loadOfflineBlacklist,
  checkOfflineBlacklist,
  type ParsedPaymentQr,
  type PaymentSafetyResult,
  type UrlSafetyResult,
} from "@/lib/qr-analysis";

export function useQrSafety(content: string | null | undefined, contentType: string | null | undefined) {
  const [parsedPayment, setParsedPayment] = useState<ParsedPaymentQr | null>(null);
  const [paymentSafety, setPaymentSafety] = useState<PaymentSafetyResult | null>(null);
  const [urlSafety, setUrlSafety] = useState<UrlSafetyResult | null>(null);
  const [offlineBlacklistMatch, setOfflineBlacklistMatch] = useState<{ matched: boolean; reason: string | null }>({ matched: false, reason: null });

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

  return { parsedPayment, paymentSafety, urlSafety, offlineBlacklistMatch };
}
