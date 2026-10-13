export interface QrSignatureResult {
  isVerified: boolean;
}

export type PaymentAppId =
  | "upi"
  | "gpay_india"
  | "phonepe"
  | "paytm"
  | "bhim"
  | "amazon_pay"
  | "bharatqr"
  | "bitcoin"
  | "ethereum"
  | "solana"
  | "litecoin"
  | "dogecoin"
  | "tron"
  | "emv_generic"
  | "unknown_payment";

export interface ParsedPaymentQr {
  app: string;
  appDisplayName: string;
  appCategory: string;
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
