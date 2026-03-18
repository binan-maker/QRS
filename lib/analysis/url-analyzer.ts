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
  "google", "gmail", "youtube", "facebook", "instagram", "twitter",
  "amazon", "flipkart", "snapdeal", "meesho", "myntra", "nykaa",
  "paytm", "phonepe", "razorpay", "cashfree", "payu",
  "sbi", "hdfc", "icici", "axis", "kotak", "rbl", "pnb", "bob",
  "rbi", "npci",
  "paypal", "venmo", "cashapp", "zelle", "stripe",
  "netflix", "hotstar", "primevideo", "spotify",
  "apple", "icloud", "microsoft", "outlook",
  "whatsapp", "telegram", "truecaller",
  "zomato", "swiggy", "blinkit",
  "olacabs", "uber",
  "uidai", "aadhaar",
  "incometax", "irctc",
  "refund", "cashback", "prize", "winner", "lottery",
  "coinbase", "binance", "bybit", "kucoin", "okx", "wazirx",
  "zerodha", "groww", "upstox",
];

const BRAND_OFFICIAL_DOMAINS: Record<string, string[]> = {
  google: ["google.com", "google.co.in", "google.org", "accounts.google.com"],
  gmail: ["gmail.com", "mail.google.com"],
  youtube: ["youtube.com", "youtu.be"],
  facebook: ["facebook.com", "fb.com", "meta.com"],
  instagram: ["instagram.com"],
  twitter: ["twitter.com", "x.com"],
  amazon: ["amazon.in", "amazon.com", "amazon.co.uk", "amazon.ae", "amazon.com.au"],
  flipkart: ["flipkart.com"],
  paytm: ["paytm.com", "p.paytm.me", "paytmbank.com"],
  phonepe: ["phonepe.com"],
  razorpay: ["razorpay.com", "rzp.io"],
  paypal: ["paypal.com", "paypal.me"],
  apple: ["apple.com", "appleid.apple.com", "icloud.com"],
  icloud: ["icloud.com", "apple.com"],
  microsoft: ["microsoft.com", "live.com", "outlook.com", "microsoftonline.com"],
  outlook: ["outlook.com", "outlook.live.com", "microsoft.com"],
  netflix: ["netflix.com"],
  spotify: ["spotify.com"],
  whatsapp: ["whatsapp.com"],
  telegram: ["telegram.org", "t.me"],
  sbi: [
    "onlinesbi.com", "sbi.co.in", "sbionline.com", "retail.onlinesbi.sbi",
    "sbicard.com", "sbicards.com", "sbimf.com", "sbigeneral.in",
    "yono.sbi.co.in", "sbi.co.in",
  ],
  hdfc: [
    "hdfcbank.com", "netbanking.hdfc.com", "hdfc.com",
    "hdfclife.com", "hdfcergo.com", "hdfcmf.com", "hdfcsec.com",
    "hdfcpension.com", "hdfcsky.com",
  ],
  icici: [
    "icicibank.com", "iciciprulife.com", "icicilombard.com",
    "icicisec.com", "icicibank.in",
  ],
  axis: ["axisbank.com", "axismf.com", "axisdirect.in", "axisbank.co.in"],
  kotak: ["kotak.com", "kotakbank.com", "kotaksec.com", "kotakmf.com", "kotakgeneral.com"],
  rbl: ["rblbank.com", "rbl.co.in"],
  pnb: ["pnbindia.in", "netpnb.com", "pnbmetlife.com"],
  bob: ["bankofbaroda.in", "bobibanking.com"],
  rbi: ["rbi.org.in"],
  npci: ["npci.org.in", "upi.npci.org.in"],
  irctc: ["irctc.co.in", "irctchelp.in"],
  uidai: ["uidai.gov.in"],
  aadhaar: ["uidai.gov.in"],
  incometax: ["incometax.gov.in", "efiling.incometax.gov.in", "taxpayerservices.tin.nsdl.com"],
  coinbase: ["coinbase.com"],
  binance: ["binance.com"],
  zerodha: ["zerodha.com", "kite.zerodha.com"],
  groww: ["groww.in"],
  upstox: ["upstox.com"],
  zomato: ["zomato.com"],
  swiggy: ["swiggy.com"],
  uber: ["uber.com"],
  stripe: ["stripe.com", "buy.stripe.com"],
  olacabs: ["olacabs.com", "mmt.in"],
  refund: [],
  cashback: [],
  prize: [],
  winner: [],
  lottery: [],
  wazirx: ["wazirx.com"],
  bybit: ["bybit.com"],
  kucoin: ["kucoin.com"],
  okx: ["okx.com"],
};

// Only flag paths that are genuine phishing indicators — NOT normal e-commerce/banking paths.
const SENSITIVE_PATH_KEYWORDS = [
  "verify-account", "update-kyc", "kyc-update", "complete-kyc",
  "otp-verify", "enter-otp",
  "pan-verify", "pan-card-verify",
  "account-recovery", "recover-account",
  "claim-prize", "claim-reward", "claim-cashback",
  "redeem-reward",
  "income-tax-refund", "tax-refund", "refund-claim",
  "free-recharge", "win-prize",
  "credit-card-apply", "loan-apply", "emi-apply",
  "kyc-complete", "aadhar-link", "aadhar-verify",
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
    warnings.push("URL uses IPv6 address — uncommon for legitimate links");
    bump("caution");
  }
  if (URL_SHORTENERS.has(hostname) || [...URL_SHORTENERS].some((s) => hostname.endsWith("." + s))) {
    warnings.push("Shortened URL — the actual destination is hidden from you");
    bump("caution");
  }

  const tld = "." + hostname.split(".").slice(-1)[0];
  if (SUSPICIOUS_TLDS.has(tld)) {
    warnings.push(`Domain uses "${tld}" — a free/abused TLD commonly used for scams`);
    bump("caution");
  }

  // Brand impersonation: only flag when hostname contains a brand keyword
  // but is NOT an official domain for that brand.
  let brandFlagged = false;
  for (const brand of BRAND_IMPERSONATION_KEYWORDS) {
    if (brand.length <= 3) continue;
    if (!hostname.includes(brand)) continue;
    const officialDomains = BRAND_OFFICIAL_DOMAINS[brand] || [];
    if (officialDomains.length === 0) continue;
    const isOfficial = officialDomains.some((d) => hostname === d || hostname.endsWith("." + d));
    if (!isOfficial) {
      // Extra check: if the root domain (last 2 levels) matches any official root, it's a subsidiary — allow.
      const rootDomain = hostname.split(".").slice(-2).join(".");
      const officialRoots = officialDomains.map((d) => d.split(".").slice(-2).join("."));
      if (officialRoots.includes(rootDomain)) continue;
      warnings.push(`Domain contains "${brand}" but is NOT the official site — likely phishing`);
      bump("dangerous");
      brandFlagged = true;
      break;
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
      if (!hostname.includes(brand)) continue;
      const officialDomains = BRAND_OFFICIAL_DOMAINS[brand] || [];
      if (officialDomains.length === 0) continue;
      const officialRoot = officialDomains.map((d) => d.split(".").slice(-2).join("."));
      if (officialRoot.length > 0 && !officialRoot.includes(rootDomain)) {
        warnings.push(`"${brand}" in subdomain but root domain is "${rootDomain}" — suspicious`);
        bump("dangerous");
        break;
      }
    }
  }

  // Only flag narrow, clearly-phishing path keywords.
  for (const kw of SENSITIVE_PATH_KEYWORDS) {
    if (pathAndQuery.includes(kw)) {
      warnings.push(`URL path contains "${kw}" — be very careful about entering personal details`);
      bump("caution");
      break;
    }
  }

  const redirectParams = ["redirect_uri", "return_url", "returnurl", "callback_url"];
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

  if (url.length > 400) {
    warnings.push("Extremely long URL — often used to hide the real destination");
    bump("caution");
  }
  if (hostname.includes("xn--")) {
    warnings.push("Domain uses international characters (Punycode) — could visually impersonate a legitimate site");
    bump("dangerous");
  }

  // @ in URL only flag if combined with other risk signals and not in a known auth pattern
  if (url.includes("@") && !url.includes("mailto:") && riskLevel !== "safe") {
    const atCount = (url.match(/@/g) || []).length;
    const isKnownEmail = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].some((d) => hostname.endsWith(d));
    if (atCount > 0 && !isKnownEmail) {
      warnings.push("URL contains '@' — could be hiding the real destination");
      bump("dangerous");
    }
  }

  return { isSuspicious: warnings.length > 0, warnings, riskLevel };
}
