import * as SecureStore from "expo-secure-store";

const BLACKLIST_CHUNK_KEY = (n: number) => `qr_bl_chunk_${n}`;
const BLACKLIST_META_KEY = "qr_bl_meta";
const BLACKLIST_TTL_MS = 24 * 60 * 60 * 1000;
const CHUNK_SIZE = 15;

export const BUILT_IN_BLACKLIST: { pattern: string; reason: string }[] = [
  { pattern: "pay-google", reason: "Google Pay impersonation" },
  { pattern: "sbi-online", reason: "SBI Bank impersonation" },
  { pattern: "phishing-login", reason: "Phishing login page" },
  { pattern: "verify-aadhar", reason: "Aadhaar verification scam" },
  { pattern: "claim-prize", reason: "Prize scam" },
  { pattern: "income-tax-refund", reason: "Income tax refund scam" },
  { pattern: "verify-pan", reason: "PAN verification scam" },
  { pattern: "cashback-paytm", reason: "Paytm cashback scam" },
  { pattern: "winner-lottery", reason: "Lottery scam" },
  { pattern: "free-recharge", reason: "Free recharge scam" },
  { pattern: "kyc-update", reason: "KYC update scam" },
  { pattern: "bank-account-verify", reason: "Bank verification scam" },
  { pattern: "double-money", reason: "Investment fraud" },
  { pattern: "loan-offer-apply", reason: "Fraudulent loan offer" },
  { pattern: "helpdesk-sbi", reason: "SBI helpdesk scam" },
  { pattern: "covid-relief-fund", reason: "COVID relief scam" },
  { pattern: "pm-kisan-benefit", reason: "PM Kisan scheme fraud" },
  { pattern: "uidai-verify", reason: "Aadhaar UIDAI scam" },
  { pattern: "rbi-cashback", reason: "RBI impersonation scam" },
  { pattern: "customs-clearance-fee", reason: "Customs clearance fraud" },
  { pattern: "income-tax-case", reason: "Tax threat scam" },
  { pattern: "arrest-warrant-cyber", reason: "Fake arrest warrant threat" },
  { pattern: "flipkart-cashback-winner", reason: "Flipkart cashback scam" },
  { pattern: "amazon-lucky-draw", reason: "Amazon prize fraud" },
  { pattern: "jio-free-sim", reason: "Jio free SIM scam" },
  { pattern: "bsnl-broadband-upgrade", reason: "BSNL phishing" },
  { pattern: "crypto-profit-scheme", reason: "Crypto investment fraud" },
  { pattern: "bitcoin-doubling", reason: "Bitcoin doubling scam" },
  { pattern: "paypal-verify-account", reason: "PayPal phishing" },
  { pattern: "netflix-free-subscription", reason: "Netflix free trial scam" },
  { pattern: "loan-approved-apply", reason: "Instant loan fraud" },
  { pattern: "ed-summons", reason: "ED/CBI threat scam" },
  { pattern: "fdic-bank-support", reason: "FDIC impersonation" },
  { pattern: "irs-refund-claim", reason: "IRS impersonation" },
  { pattern: "medicare-card-update", reason: "Medicare scam" },
  { pattern: "social-security-suspend", reason: "SSA fraud" },
  { pattern: "win-lottery-ticket", reason: "Lottery fraud" },
  { pattern: "inheritance-claim-fund", reason: "Inheritance fraud" },
  { pattern: "advance-fee-transfer", reason: "Advance fee fraud (419)" },
  { pattern: "gift-card-claim-reward", reason: "Gift card scam" },
  { pattern: "alipay-account-verify", reason: "Alipay phishing" },
  { pattern: "wechat-security-alert", reason: "WeChat phishing" },
  { pattern: "mpesa-free-bundle", reason: "M-Pesa free data scam" },
  { pattern: "nft-whitelist-mint", reason: "NFT scam" },
  { pattern: "metamask-wallet-verify", reason: "MetaMask wallet drain" },
  { pattern: "opensea-claim-nft", reason: "OpenSea phishing" },
];

interface BlacklistMeta {
  chunks: number;
  savedAt: number;
}

export async function loadOfflineBlacklist(): Promise<{ pattern: string; reason: string }[]> {
  try {
    const metaRaw = await SecureStore.getItemAsync(BLACKLIST_META_KEY);
    if (!metaRaw) return BUILT_IN_BLACKLIST;
    const meta: BlacklistMeta = JSON.parse(metaRaw);
    if (Date.now() - meta.savedAt > BLACKLIST_TTL_MS) return BUILT_IN_BLACKLIST;
    const extra: { pattern: string; reason: string }[] = [];
    for (let i = 0; i < meta.chunks; i++) {
      const chunk = await SecureStore.getItemAsync(BLACKLIST_CHUNK_KEY(i));
      if (chunk) extra.push(...(JSON.parse(chunk) as { pattern: string; reason: string }[]));
    }
    return [...BUILT_IN_BLACKLIST, ...extra];
  } catch {
    return BUILT_IN_BLACKLIST;
  }
}

export async function saveOfflineBlacklist(
  extra: { pattern: string; reason: string }[]
): Promise<void> {
  try {
    const chunks: { pattern: string; reason: string }[][] = [];
    for (let i = 0; i < extra.length; i += CHUNK_SIZE) {
      chunks.push(extra.slice(i, i + CHUNK_SIZE));
    }
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(BLACKLIST_CHUNK_KEY(i), JSON.stringify(chunks[i]));
    }
    const meta: BlacklistMeta = { chunks: chunks.length, savedAt: Date.now() };
    await SecureStore.setItemAsync(BLACKLIST_META_KEY, JSON.stringify(meta));
  } catch {}
}

export function checkOfflineBlacklist(
  content: string,
  blacklist: { pattern: string; reason: string }[]
): { matched: boolean; reason: string | null } {
  const lower = content.toLowerCase();
  for (const entry of blacklist) {
    if (lower.includes(entry.pattern)) {
      return { matched: true, reason: entry.reason };
    }
  }
  return { matched: false, reason: null };
}
