import type { PaymentAppId, ParsedPaymentQr } from "../types";

export interface AppDef {
  id: PaymentAppId;
  displayName: string;
  category: ParsedPaymentQr["appCategory"];
  region: string;
  schemes: string[];
  urlPatterns: string[];
  trustedDomains?: string[];
}

export const PAYMENT_APP_REGISTRY: AppDef[] = [
  {
    id: "upi",
    displayName: "UPI Payment",
    category: "upi_india",
    region: "India",
    schemes: [
      "upi://pay",
      "upi://",
      "tez://upi",
      "gpay://upi",
      "phonepe://pay",
      "phonepe://upi",
      "paytmmp://pay",
      "paytm://",
      "bhim://",
    ],
    urlPatterns: [],
    trustedDomains: ["upi.npci.org.in"],
  },
  {
    id: "bitcoin",
    displayName: "Bitcoin",
    category: "crypto",
    region: "Global",
    schemes: ["bitcoin:"],
    urlPatterns: [],
    trustedDomains: [],
  },
  {
    id: "ethereum",
    displayName: "Ethereum",
    category: "crypto",
    region: "Global",
    schemes: ["ethereum:", "eth:"],
    urlPatterns: [],
    trustedDomains: [],
  },
  {
    id: "solana",
    displayName: "Solana",
    category: "crypto",
    region: "Global",
    schemes: ["solana:"],
    urlPatterns: [],
    trustedDomains: [],
  },
  {
    id: "litecoin",
    displayName: "Litecoin",
    category: "crypto",
    region: "Global",
    schemes: ["litecoin:"],
    urlPatterns: [],
    trustedDomains: [],
  },
  {
    id: "monero",
    displayName: "Monero",
    category: "crypto",
    region: "Global",
    schemes: ["monero:"],
    urlPatterns: [],
    trustedDomains: [],
  },
  {
    id: "bitcoin_cash",
    displayName: "Bitcoin Cash",
    category: "crypto",
    region: "Global",
    schemes: ["bitcoincash:"],
    urlPatterns: [],
    trustedDomains: [],
  },
  {
    id: "xrp",
    displayName: "XRP",
    category: "crypto",
    region: "Global",
    schemes: ["xrpl:", "ripple:", "xrp:"],
    urlPatterns: [],
    trustedDomains: [],
  },
  {
    id: "dogecoin",
    displayName: "Dogecoin",
    category: "crypto",
    region: "Global",
    schemes: ["dogecoin:"],
    urlPatterns: [],
    trustedDomains: [],
  },
  {
    id: "bnb",
    displayName: "BNB",
    category: "crypto",
    region: "Global",
    schemes: ["bnb:", "binance:"],
    urlPatterns: [],
    trustedDomains: [],
  },
  {
    id: "tron",
    displayName: "TRON",
    category: "crypto",
    region: "Global",
    schemes: ["tron:"],
    urlPatterns: [],
    trustedDomains: [],
  },
];

