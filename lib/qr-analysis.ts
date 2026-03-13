import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── UPI / Payment QR Parsing ──────────────────────────────────────────────

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

// All NPCI-registered UPI bank handles (commonly used)
const VALID_UPI_HANDLES = new Set([
  "okaxis", "okhdfcbank", "okicici", "oksbi",
  "ybl", "ibl", "axl",
  "paytm", "paytmbank",
  "upi", "rbl",
  "hdfcbank", "icici", "sbi", "axisbank",
  "kotak", "idbi", "federal", "indus",
  "boi", "centralbank", "pnb", "bob",
  "indianbank", "syndicatebank", "allbank",
  "aubank", "airtel", "juspay",
  "freecharge", "mobikwik",
  "yapl", "timecosmos",
  "rajgovhdfcbank", "dlb", "mahb",
  "kvb", "sib", "cbin",
  "cnrb", "cub", "dcb",
  "equitas", "esaf", "fino",
  "idfc", "ikwik", "idfcbank",
  "uco", "uboi", "ubi",
  "vijb", "barodampay", "myicici",
  "naviaxis", "nsdl", "oksbi",
  "pingpay", "postbank",
  "qb", "rblbank", "saraswat",
  "scb", "scmb", "shriramhfl",
  "tjsb", "ucobank", "ujjivan",
  "utbi", "zoicici",
]);

export function parseUpiQr(content: string): ParsedUpiQr | null {
  const lower = content.toLowerCase();
  if (
    !lower.startsWith("upi://") &&
    !lower.startsWith("tez://") &&
    !lower.startsWith("phonepe://") &&
    !lower.startsWith("paytm://") &&
    !lower.startsWith("gpay://") &&
    !lower.startsWith("bhim://")
  ) {
    return null;
  }

  try {
    // Normalize to a parseable URL
    let normalized = content;
    if (lower.startsWith("upi://pay?")) {
      normalized = "https://upi.pay?" + content.split("?")[1];
    } else if (lower.startsWith("tez://upi/pay?")) {
      normalized = "https://tez.pay?" + content.split("?")[1];
    } else if (lower.startsWith("phonepe://pay?")) {
      normalized = "https://phonepe.pay?" + content.split("?")[1];
    } else if (lower.startsWith("paytm://")) {
      normalized = "https://paytm.pay?" + (content.split("?")[1] || "");
    } else if (lower.startsWith("gpay://")) {
      normalized = "https://gpay.pay?" + (content.split("?")[1] || "");
    } else if (lower.startsWith("bhim://")) {
      normalized = "https://bhim.pay?" + (content.split("?")[1] || "");
    } else {
      normalized = "https://upi.pay?" + (content.split("?")[1] || "");
    }

    const url = new URL(normalized);
    const pa = url.searchParams.get("pa") || url.searchParams.get("PA") || "";
    const pn = url.searchParams.get("pn") || url.searchParams.get("PN") || "";
    const am = url.searchParams.get("am") || url.searchParams.get("AM") || null;
    const cu = url.searchParams.get("cu") || url.searchParams.get("CU") || "INR";
    const tn = url.searchParams.get("tn") || url.searchParams.get("TN") || null;
    const mc = url.searchParams.get("mc") || url.searchParams.get("MC") || null;

    const atIndex = pa.lastIndexOf("@");
    const bankHandle = atIndex >= 0 ? pa.slice(atIndex + 1).toLowerCase() : "";

    return {
      vpa: pa,
      payeeName: pn,
      amount: am ? parseFloat(am).toFixed(2) : null,
      currency: cu.toUpperCase(),
      transactionNote: tn,
      merchantCategory: mc,
      bankHandle,
      isAmountPreFilled: !!am && parseFloat(am) > 0,
    };
  } catch {
    return null;
  }
}

// ─── UPI Safety Analysis ────────────────────────────────────────────────────

export interface PaymentSafetyResult {
  isSuspicious: boolean;
  warnings: string[];
  riskLevel: "safe" | "caution" | "dangerous";
}

export function analyzePaymentQr(parsed: ParsedUpiQr): PaymentSafetyResult {
  const warnings: string[] = [];

  // 1. Invalid or unknown bank handle
  if (!parsed.bankHandle) {
    warnings.push("No bank handle found in VPA — this may not be a valid UPI address");
  } else if (!VALID_UPI_HANDLES.has(parsed.bankHandle)) {
    warnings.push(`Unknown bank handle "@${parsed.bankHandle}" — verify before paying`);
  }

  // 2. No payee name at all
  if (!parsed.payeeName || parsed.payeeName.trim() === "") {
    warnings.push("No payee name specified — legitimate businesses always display their name");
  }

  // 3. Suspicious payee name patterns (brand impersonation)
  const suspiciousNameKeywords = [
    "google", "paytm", "amazon", "flipkart", "phonepe",
    "sbi", "hdfc", "icici", "axis", "rbi", "income tax",
    "pm india", "modi", "support", "helpline", "refund",
    "lottery", "winner", "prize", "cashback", "free",
    "bank", "govt", "government", "police", "cbi", "uidai",
  ];
  const lowerName = parsed.payeeName.toLowerCase();
  for (const kw of suspiciousNameKeywords) {
    if (lowerName.includes(kw)) {
      const brandedHandle = isBrandedHandle(parsed.bankHandle, kw);
      if (!brandedHandle) {
        warnings.push(
          `Payee name contains "${kw}" but the VPA does not match — possible impersonation`
        );
        break;
      }
    }
  }

  // 4. Pre-filled amount is suspicious for general QR codes
  if (parsed.isAmountPreFilled) {
    const amt = parseFloat(parsed.amount!);
    if (amt > 50000) {
      warnings.push(`Large pre-filled amount: ₹${amt.toLocaleString("en-IN")} — only pay if you initiated this`);
    } else {
      // Not necessarily dangerous, just note it
    }
  }

  // 5. VPA looks random / auto-generated (scammer patterns: 16-char random strings)
  const vpaLocal = parsed.vpa.split("@")[0];
  if (vpaLocal.length > 20) {
    warnings.push("VPA identifier is unusually long — could be auto-generated");
  }

  // 6. Payee name doesn't match VPA identifier at all (very basic check)
  if (parsed.payeeName && vpaLocal) {
    const nameWords = parsed.payeeName.toLowerCase().split(/\s+/);
    const vpaNorm = vpaLocal.toLowerCase().replace(/[^a-z0-9]/g, "");
    const anyMatch = nameWords.some(
      (w) => w.length >= 4 && vpaNorm.includes(w.slice(0, 4))
    );
    if (!anyMatch && nameWords.length > 0 && nameWords[0].length >= 4) {
      // Soft warning only — many legitimate VPAs don't match names
    }
  }

  const isSuspicious = warnings.length > 0;
  let riskLevel: "safe" | "caution" | "dangerous" = "safe";
  if (warnings.length >= 3) riskLevel = "dangerous";
  else if (warnings.length >= 1) riskLevel = "caution";

  return { isSuspicious, warnings, riskLevel };
}

function isBrandedHandle(bankHandle: string, keyword: string): boolean {
  const officialHandles: Record<string, string[]> = {
    google: ["okaxis", "okhdfcbank", "okicici", "oksbi"],
    paytm: ["paytm", "paytmbank"],
    phonepe: ["ybl", "ibl", "axl"],
    amazon: ["yapl"],
    sbi: ["oksbi", "sbi"],
    hdfc: ["okhdfcbank", "hdfcbank"],
    icici: ["okicici", "icici"],
    axis: ["okaxis", "axisbank"],
  };
  const allowed = officialHandles[keyword];
  return allowed ? allowed.includes(bankHandle) : false;
}

// ─── URL Heuristic Analysis ─────────────────────────────────────────────────

export interface UrlSafetyResult {
  isSuspicious: boolean;
  warnings: string[];
  riskLevel: "safe" | "caution" | "dangerous";
}

// Known brand names that scammers impersonate in domain names
const BRAND_IMPERSONATION_KEYWORDS = [
  "google", "facebook", "instagram", "twitter", "x",
  "amazon", "flipkart", "paytm", "phonepe", "razorpay",
  "sbi", "hdfc", "icici", "axis", "rbi", "neft", "npci",
  "paypal", "netflix", "apple", "microsoft", "whatsapp",
  "telegram", "truecaller", "zomato", "swiggy", "olacabs",
  "uber", "uidai", "aadhar", "aadhaar", "pan", "kyc",
  "income.tax", "irctc", "railway", "police", "cyber",
  "refund", "cashback", "free", "winner", "lottery", "prize",
  "bank", "loan", "emi", "wallet", "account", "verify",
];

// Legitimate TLDs for these brands (if domain IS the brand, not suspicious)
const BRAND_OFFICIAL_DOMAINS: Record<string, string[]> = {
  google: ["google.com", "google.co.in", "google.org"],
  facebook: ["facebook.com", "fb.com", "meta.com"],
  amazon: ["amazon.in", "amazon.com"],
  paytm: ["paytm.com"],
  phonepe: ["phonepe.com"],
  paypal: ["paypal.com"],
  apple: ["apple.com"],
  microsoft: ["microsoft.com"],
  netflix: ["netflix.com"],
  sbi: ["onlinesbi.com", "sbi.co.in"],
  irctc: ["irctc.co.in"],
};

export function analyzeUrlHeuristics(url: string): UrlSafetyResult {
  const warnings: string[] = [];
  let riskLevel: "safe" | "caution" | "dangerous" = "safe";

  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    warnings.push("Invalid URL format");
    return { isSuspicious: true, warnings, riskLevel: "caution" };
  }

  const hostname = parsed.hostname.toLowerCase();
  const fullPath = url.toLowerCase();

  // 1. HTTP (not HTTPS)
  if (parsed.protocol === "http:") {
    warnings.push("Connection is not encrypted (HTTP) — your data could be intercepted");
  }

  // 2. IP address instead of domain name
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    warnings.push("URL uses a raw IP address instead of a domain name — very suspicious");
    riskLevel = "dangerous";
  }

  // 3. URL shorteners
  const shorteners = [
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
    "is.gd", "buff.ly", "ift.tt", "short.ly", "rb.gy",
    "cutt.ly", "shorturl.at", "tiny.cc", "s.id",
  ];
  if (shorteners.some((s) => hostname === s || hostname.endsWith("." + s))) {
    warnings.push("URL is shortened — the actual destination is hidden");
  }

  // 4. Suspicious TLDs
  const suspiciousTlds = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click", ".win"];
  if (suspiciousTlds.some((tld) => hostname.endsWith(tld))) {
    warnings.push("Domain uses a free/suspicious TLD commonly used by scammers");
    riskLevel = "caution";
  }

  // 5. Brand impersonation in subdomain or domain
  for (const brand of BRAND_IMPERSONATION_KEYWORDS) {
    if (hostname.includes(brand)) {
      const officialDomains = BRAND_OFFICIAL_DOMAINS[brand] || [];
      const isOfficial = officialDomains.length > 0
        ? officialDomains.some((d) => hostname === d || hostname.endsWith("." + d))
        : false;

      if (!isOfficial) {
        warnings.push(
          `Domain contains "${brand}" but doesn't appear to be the official site — possible phishing`
        );
        riskLevel = "dangerous";
        break;
      }
    }
  }

  // 6. Excessive subdomains (a.b.c.d.somesite.com)
  const parts = hostname.split(".");
  if (parts.length > 4) {
    warnings.push("Unusually many subdomains — legitimate sites rarely use this many");
  }

  // 7. Sensitive keywords in path/query
  const sensitiveKeywords = [
    "login", "signin", "sign-in", "verify", "verification",
    "update", "wallet", "payment", "banking", "otp",
    "kyc", "aadhar", "aadhaar", "pan-card",
    "password", "reset-password", "account-recovery",
  ];
  for (const kw of sensitiveKeywords) {
    if (fullPath.includes(kw)) {
      warnings.push(`URL contains "${kw}" — be cautious about entering personal details`);
      break;
    }
  }

  // 8. Very long URL (obfuscation technique)
  if (url.length > 200) {
    warnings.push("Extremely long URL — could be designed to hide its true destination");
  }

  const isSuspicious = warnings.length > 0;
  if (warnings.length >= 3 && riskLevel !== "dangerous") riskLevel = "dangerous";
  else if (warnings.length >= 1 && riskLevel === "safe") riskLevel = "caution";

  return { isSuspicious, warnings, riskLevel };
}

// ─── Comment Keyword Blacklist ──────────────────────────────────────────────

const KEYWORD_BLACKLIST = [
  // Scam / fraud patterns
  "double your money", "investment return", "guaranteed profit",
  "send money to", "transfer ₹", "transfer rs", "pay now to",
  "click here to claim", "you have won", "you are selected",
  "congratulations you", "lucky winner",
  "telegram link", "join telegram", "join whatsapp group",
  "earn from home", "earn daily", "work from home earn",
  "forex trading", "crypto investment", "bitcoin profit",
  "share your account", "otp share", "send otp",
  "i will pay you", "i will send money",
  // Phishing
  "verify your account", "your account will be blocked",
  "click the link below", "confirm your details",
  "update your kyc", "urgent action required",
  // Spam
  "follow me on", "subscribe to my", "visit my profile",
  "check my link", "dm me for",
];

export function checkCommentKeywords(text: string): {
  blocked: boolean;
  matchedKeyword: string | null;
} {
  const lower = text.toLowerCase();
  for (const kw of KEYWORD_BLACKLIST) {
    if (lower.includes(kw)) {
      return { blocked: true, matchedKeyword: kw };
    }
  }
  return { blocked: false, matchedKeyword: null };
}

// ─── Offline Local Blacklist ─────────────────────────────────────────────────

const OFFLINE_BLACKLIST_KEY = "qr_offline_blacklist";
const OFFLINE_BLACKLIST_TS_KEY = "qr_offline_blacklist_ts";
const OFFLINE_BLACKLIST_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Built-in starter blacklist (always available offline)
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
];

export async function loadOfflineBlacklist(): Promise<{ pattern: string; reason: string }[]> {
  try {
    const ts = await AsyncStorage.getItem(OFFLINE_BLACKLIST_TS_KEY);
    const raw = await AsyncStorage.getItem(OFFLINE_BLACKLIST_KEY);
    if (!ts || !raw) return BUILT_IN_BLACKLIST;
    if (Date.now() - parseInt(ts, 10) > OFFLINE_BLACKLIST_TTL) {
      return BUILT_IN_BLACKLIST;
    }
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
