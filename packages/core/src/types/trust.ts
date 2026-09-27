export type TrustTier = "trusted" | "neutral" | "suspicious" | "dangerous";

export interface TrustScore {
  score: number;
  tier: TrustTier;
  reportCount: number;
  scanCount: number;
  lastUpdated: number;
}

export interface Report {
  id: string;
  qrCodeId: string;
  reportedBy: string;
  type: string;
  reason?: string;
  createdAt: number;
  weight: number;
}
