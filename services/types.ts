export interface QrSignatureResult {
  isVerified: boolean;
}

export type PaymentAppId =
  | "upi"
  | "bharatqr"
  | "sepa_transfer"
  | "bitcoin"
  | "ethereum"
  | "litecoin"
  | "monero"
  | "bitcoin_cash"
  | "solana"
  | "xrp"
  | "dogecoin"
  | "bnb"
  | "tron"
  | "usdt"
  | "emv_generic"
  | "unknown_payment";

export interface ParsedPaymentQr {
  app: PaymentAppId;
  appDisplayName: string;
  appCategory: "upi_india" | "europe" | "crypto" | "emv" | "other";
  region: string;
  recipientId: string;
  recipientName?: string;
  amount?: string;
  currency?: string;
  note?: string;
  rawContent: string;
  isAmountPreFilled: boolean;
  bankHandle?: string;
  vpa?: string;
  coinType?: string;
  isEmv?: boolean;
  extraFields?: Record<string, string>;
}

export interface Evidence {
  type: "positive" | "negative" | "neutral" | "info";
  label: string;
  value: string;
}

export interface ParsedUpiQr {
  vpa: string;
  payeeName: string;
  amount: string | null;
  currency: string;
  transactionNote: string | null;
  merchantCategory: string | null;
  bankHandle: string;
  isAmountPreFilled: boolean;
}

export interface PaymentSafetyResult {
  isSuspicious: boolean;
  warnings: string[];
  riskLevel: "safe" | "caution" | "dangerous";
  appInfo: string;
  evidence: Evidence[];
}
