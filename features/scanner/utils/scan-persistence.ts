import AsyncStorage from "@react-native-async-storage/async-storage";
import { appendToLocalScanHistory, makeScanEntry } from "@/features/scanner/utils/scan-history";
import { getOrCreateQrCode, recordScan } from "@/lib/data-service";
import { setAnonymousQrContent } from "@/services/cache/anonymous-session";
import { emitScanEvent } from "@/services/scan-history";
import { evaluateAndIssueScanReward, setScanRewardResult } from "@/services/rewards";

export async function persistScanResult({
  qrId,
  content,
  contentType,
  user,
  anonymousMode,
  platform,
}: {
  qrId: string;
  content: string;
  contentType: string;
  user: any;
  anonymousMode: boolean;
  platform: "android" | "ios" | "web" | "unknown";
}) {
  const isAnon = anonymousMode || !user;
  if (isAnon) {
    setAnonymousQrContent(qrId, content, contentType);
  }

  // Fast local caching
  AsyncStorage.setItem(`qr_content_${qrId}`, JSON.stringify({ content, contentType })).catch(() => {});
  appendToLocalScanHistory(user?.id ?? null, makeScanEntry(content, contentType, qrId, !user)).catch(() => {});
  emitScanEvent(qrId, { platform, contentType, verdict: "unknown" });

  // Evaluate coupon scratch card reward in background
  (async () => {
    try {
      const rewardResult = await evaluateAndIssueScanReward({
        userId: user?.id,
        qrCodeId: qrId,
        isAnonymous: isAnon,
      });
      setScanRewardResult(qrId, rewardResult);
    } catch {}
  })();

  // Background cloud sync for authenticated users
  if (user?.id && !anonymousMode) {
    (async () => {
      try {
        const qr = await getOrCreateQrCode(content);
        const resolvedId = qr?.id || qrId;
        const resolvedType = qr?.contentType || contentType;
        await recordScan(resolvedId, content, resolvedType, user.id, false).catch(() => {});
      } catch {}
    })();
  }
}
