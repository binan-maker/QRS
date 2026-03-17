import AsyncStorage from "@react-native-async-storage/async-storage";

const OFFLINE_BLACKLIST_KEY = "qr_offline_blacklist";
const OFFLINE_BLACKLIST_TS_KEY = "qr_offline_blacklist_ts";
const OFFLINE_BLACKLIST_TTL = 24 * 60 * 60 * 1000;

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

export async function loadOfflineBlacklist(): Promise<{ pattern: string; reason: string }[]> {
  try {
    const ts = await AsyncStorage.getItem(OFFLINE_BLACKLIST_TS_KEY);
    const raw = await AsyncStorage.getItem(OFFLINE_BLACKLIST_KEY);
    if (!ts || !raw) return BUILT_IN_BLACKLIST;
    if (Date.now() - parseInt(ts, 10) > OFFLINE_BLACKLIST_TTL) return BUILT_IN_BLACKLIST;
    const parsed = JSON.parse(raw);
    return [...BUILT_IN_BLACKLIST, ...parsed];
  } catch {
    return BUILT_IN_BLACKLIST;
  }
}

export async function saveOfflineBlacklist(
  extra: { pattern: string; reason: string }[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(OFFLINE_BLACKLIST_KEY, JSON.stringify(extra));
    await AsyncStorage.setItem(OFFLINE_BLACKLIST_TS_KEY, Date.now().toString());
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
