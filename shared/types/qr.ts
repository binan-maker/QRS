export type QrContentType = "url" | "payment" | "text" | "email" | "phone" | "wifi" | "other";

export type QrRiskLevel = "safe" | "caution" | "dangerous";

export interface QrCode {
  id: string;
  content: string;
  contentType: QrContentType;
  createdAt: number;
  createdBy?: string;
  scanCount?: number;
  isActive?: boolean;
  bgColor?: string;
  fgColor?: string;
  businessName?: string;
  slug?: string;
}

export interface QrScanResult {
  id: string;
  content: string;
  contentType: QrContentType;
  scannedAt: number;
  riskLevel?: QrRiskLevel;
  isFavorite?: boolean;
}
