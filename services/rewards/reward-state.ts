import type { RewardEligibilityResult } from "./types";

// In-memory cache of scan reward results keyed by qrCodeId
const scanRewardCache = new Map<string, RewardEligibilityResult>();
const listeners = new Set<(qrId: string, result: RewardEligibilityResult) => void>();

export function setScanRewardResult(qrId: string, result: RewardEligibilityResult): void {
  scanRewardCache.set(qrId, result);
  listeners.forEach((fn) => fn(qrId, result));
}

export function getScanRewardResult(qrId: string): RewardEligibilityResult | null {
  return scanRewardCache.get(qrId) || null;
}

export function clearScanRewardResult(qrId: string): void {
  scanRewardCache.delete(qrId);
}

export function subscribeScanReward(listener: (qrId: string, result: RewardEligibilityResult) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
