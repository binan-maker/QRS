import type { UrlSafetyResult } from "./types";

const URL_SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
  "is.gd", "buff.ly", "ift.tt", "short.ly", "rb.gy",
  "cutt.ly", "shorturl.at", "tiny.cc", "s.id",
  "qr.ae", "b23.ru", "bl.ink", "br.cc", "clck.ru",
  "cli.gs", "cur.lv", "db.tt", "dlvr.it",
  "fur.ly", "go2l.ink", "hubs.ly", "j.mp",
  "lnkd.in", "mcaf.ee", "murl.com", "o.oo7.jp",
  "ping.fm", "post.ly", "prettylinkpro.com",
  "q.gs", "qr.net", "redd.it", "scrnch.me", "short.ie",
  "snipurl.com", "su.pr", "tr.im", "twit.ac", "u.bb",
  "u.to", "url.ie", "urlcut.com", "urlenco.de", "v.gd",
  "virl.com", "vzturl.com", "x.co", "xrl.in", "xurl.jp",
  "yfrog.com", "youtu.be", "z0p.de", "zi.ma",
  "2.gp", "2big.at", "2u.pw", "4ks.net", "4url.cc",
  "lc.chat", "shor.by", "shrinkme.io", "shortto.me",
  "inx.lv", "filoops.info", "virb.com",
  "qrco.de", "t.ly", "waa.ai", "b.link", "han.gl",
]);

const SUSPICIOUS_TLDS = new Set([
  ".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click",
  ".win", ".loan", ".download", ".cam", ".stream", ".gdn",
  ".racing", ".bid", ".trade", ".party", ".review", ".men",
  ".date", ".faith", ".accountant", ".science", ".work", ".ninja",
  ".country", ".kim", ".xin", ".bar",
]);

const BRAND_IMPERSONATION_KEYWORDS = [
  "google", "gmail", "youtube", "facebook", "instagram", "twitter", "x",
  "amazon", "flipkart", "snapdeal", "meesho", "myntra", "nykaa",
  "paytm", "phonepe", "razorpay", "cashfree", "payu",
  "sbi", "hdfc", "icici", "axis", "kotak", "rbl", "pnb", "bob",
  "rbi", "npci", "neft", "imps", "upi",
  "paypal", "venmo", "cashapp", "zelle", "stripe",
  "netflix", "hotstar", "primevideo", "spotify", "disneyplus",
  "apple", "iphone", "icloud", "microsoft", "windows", "outlook",
  "whatsapp", "telegram", "signal", "truecaller",
  "zomato", "swiggy", "blinkit", "zepto", "dunzo",
  "olacabs", "uber", "rapido", "namma",
  "uidai", "aadhar", "aadhaar", "pan", "kyc",
  "incometax", "income-tax", "irctc", "railway", "rrb",
  "police", "cyber", "cbi", "ed",
  "refund", "cashback", "prize", "winner", "lottery", "free",
  "wallet", "account", "banking", "netbanking",
  "loan", "emi", "creditcard", "credit-card", "debitcard",
  "coinbase", "binance", "bybit", "kucoin", "okx", "wazirx", "coindcx",
  "zerodha", "groww", "upstox", "angelone", "smallcase",
  "bookmyshow", "makemytrip", "yatra", "ixigo", "redbus",
  "healthcare", "covid", "vaccine", "arogya",
  "paytmbank", "digibank", "niyo", "fi-money",
  "cred", "slice", "lazypay", "simpl",
];

const BRAND_OFFICIAL_DOMAINS: Record<string, string[]> = {
  google: ["google.com", "google.co.in", "google.org", "accounts.google.com"],
  gmail: ["gmail.com", "mail.google.com"],
  youtube: ["youtube.com", "youtu.be"],
  facebook: ["facebook.com", "fb.com", "meta.com"],
  instagram: ["instagram.com"],
  twitter: ["twitter.com", "x.com"],
  amazon: ["amazon.in", "amazon.com", "amazon.co.uk"],
  flipkart: ["flipkart.com"],
  paytm: ["paytm.com", "p.paytm.me"],
  phonepe: ["phonepe.com"],
  razorpay: ["razorpay.com", "rzp.io"],
  paypal: ["paypal.com", "paypal.me"],
  apple: ["apple.com", "appleid.apple.com", "icloud.com"],
  microsoft: ["microsoft.com", "live.com", "outlook.com"],
  netflix: ["netflix.com"],
  spotify: ["spotify.com"],
  whatsapp: ["whatsapp.com"],
  telegram: ["telegram.org", "t.me"],
  sbi: ["onlinesbi.com", "sbi.co.in", "sbionline.com"],
  hdfc: ["hdfcbank.com", "netbanking.hdfc.com"],
  icici: ["icicibank.com"],
  axis: ["axisbank.com"],
  kotak: ["kotak.com", "kotakbank.com"],
  irctc: ["irctc.co.in"],
  uidai: ["uidai.gov.in"],
  incometax: ["incometax.gov.in", "efiling.incometax.gov.in"],
  coinbase: ["coinbase.com"],
  binance: ["binance.com"],
  zerodha: ["zerodha.com", "kite.zerodha.com"],
  groww: ["groww.in"],
  zomato: ["zomato.com"],
  swiggy: ["swiggy.com"],
  uber: ["uber.com"],
  stripe: ["stripe.com", "buy.stripe.com"],
};

const SENSITIVE_PATH_KEYWORDS = [
  "login", "signin", "sign-in", "sign_in", "log-in",
  "verify", "verification", "verify-account",
  "update", "update-kyc", "kyc-update", "complete-kyc",
  "wallet", "payment", "pay-now", "checkout",
  "banking", "netbanking", "online-banking",
  "otp", "otp-verify", "enter-otp",
  "kyc", "aadhar", "aadhaar", "pan-card", "pan-verify",
  "password", "reset-password", "forgot-password",
  "account-recovery", "recover-account",
  "claim", "claim-prize", "claim-reward", "claim-cashback",
  "redeem", "redeem-reward",
  "withdraw", "withdrawal",
  "income-tax-refund", "tax-refund", "refund-claim",
  "credit-card-apply", "loan-apply", "emi-apply",
  "free-recharge", "win-prize",
];

export function analyzeUrlHeuristics(url: string): UrlSafetyResult {
  const warnings: string[] = [];
  let riskLevel: "safe" | "caution" | "dangerous" = "safe";

  function bump(level: "caution" | "dangerous") {
    if (level === "dangerous") riskLevel = "dangerous";
    else if (riskLevel === "safe") riskLevel = "caution";
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    warnings.push("Invalid URL format — cannot verify destination");
    return { isSuspicious: true, warnings, riskLevel: "caution" };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathAndQuery = (parsed.pathname + parsed.search).toLowerCase();

  if (parsed.protocol === "http:") {
    warnings.push("Not encrypted (HTTP) — your data can be intercepted in transit");
    bump("caution");
  }
  if (url.startsWith("data:")) {
    warnings.push("Embedded data URI — could contain malicious scripts or hidden content");
    bump("dangerous");
  }
  if (url.startsWith("javascript:")) {
    warnings.push("JavaScript URI — could execute malicious code on your device");
    bump("dangerous");
  }
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    warnings.push("URL uses a raw IP address instead of a domain name — extremely suspicious");
    bump("dangerous");
  }
  if (hostname.startsWith("[")) {
    warnings.push("URL uses IPv6 address — uncommon for legitimate payment links");
    bump("caution");
  }
  if (URL_SHORTENERS.has(hostname) || [...URL_SHORTENERS].some((s) => hostname.endsWith("." + s))) {
    warnings.push("Shortened URL — the actual destination is completely hidden from you");
    bump("caution");
  }

  const tld = "." + hostname.split(".").slice(-1)[0];
  if (SUSPICIOUS_TLDS.has(tld)) {
    warnings.push(`Domain uses "${tld}" — a free/abused TLD commonly used for scams`);
    bump("caution");
  }

  let brandFlagged = false;
  for (const brand of BRAND_IMPERSONATION_KEYWORDS) {
    if (brand.length <= 3) continue;
    if (hostname.includes(brand)) {
      const officialDomains = BRAND_OFFICIAL_DOMAINS[brand] || [];
      if (officialDomains.length === 0) continue;
      const isOfficial = officialDomains.some((d) => hostname === d || hostname.endsWith("." + d));
      if (!isOfficial) {
        warnings.push(`Domain contains "${brand}" but is NOT the official site — likely phishing`);
        bump("dangerous");
        brandFlagged = true;
        break;
      }
    }
  }

  const domainParts = hostname.split(".");
  if (domainParts.length > 4) {
    warnings.push("Excessive subdomains — a common trick to disguise the real domain");
    bump("caution");
  }

  if (!brandFlagged) {
    const rootDomain = domainParts.slice(-2).join(".");
    for (const brand of BRAND_IMPERSONATION_KEYWORDS) {
      if (brand.length <= 3) continue;
      if (hostname.includes(brand)) {
        const officialRoot = (BRAND_OFFICIAL_DOMAINS[brand] || []).map(
          (d) => d.split(".").slice(-2).join(".")
        );
        if (officialRoot.length > 0 && !officialRoot.includes(rootDomain)) {
          warnings.push(`"${brand}" in subdomain but root domain is "${rootDomain}" — suspicious`);
          bump("dangerous");
          break;
        }
      }
    }
  }

  for (const kw of SENSITIVE_PATH_KEYWORDS) {
    if (pathAndQuery.includes(kw)) {
      warnings.push(`URL path contains "${kw}" — be very careful about entering personal details`);
      bump("caution");
      break;
    }
  }

  const redirectParams = ["redirect", "redirect_uri", "return_url", "returnurl", "callback_url", "next", "url", "target", "to"];
  for (const p of redirectParams) {
    if (parsed.searchParams.has(p)) {
      const val = parsed.searchParams.get(p) || "";
      if (val.startsWith("http")) {
        warnings.push("URL contains a redirect to another site — final destination may be harmful");
        bump("caution");
        break;
      }
    }
  }

  if (url.length > 300) {
    warnings.push("Extremely long URL — often used to hide the real destination or overwhelm security checks");
    bump("caution");
  }
  if (hostname.includes("xn--")) {
    warnings.push("Domain uses international characters (Punycode) — could be impersonating a well-known site visually");
    bump("dangerous");
  }

  const queryVals = [...parsed.searchParams.values()];
  for (const val of queryVals) {
    if (val.length > 50 && /^[A-Za-z0-9+/=]{50,}$/.test(val)) {
      warnings.push("URL parameter appears Base64-encoded — destination details are obfuscated");
      bump("caution");
      break;
    }
  }

  if (url.includes("@") && !url.includes("mailto:")) {
    const atCount = (url.match(/@/g) || []).length;
    if (atCount > 0 && !["gmail.com", "yahoo.com", "hotmail.com"].some(d => hostname.endsWith(d))) {
      warnings.push("URL contains '@' character — could be hiding the real destination");
      bump("dangerous");
    }
  }

  return { isSuspicious: warnings.length > 0, warnings, riskLevel };
}
