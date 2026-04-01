import type { UrlSafetyResult, Evidence } from "./types";

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
  const evidence: Evidence[] = [];
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
    evidence.push({ type: "negative", label: "URL Format", value: "Invalid — Cannot Verify" });
    return { isSuspicious: true, warnings, riskLevel: "caution", evidence };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathAndQuery = (parsed.pathname + parsed.search).toLowerCase();

  // ── Protocol ─────────────────────────────────────────────────────────────
  if (parsed.protocol === "https:") {
    evidence.push({ type: "positive", label: "Protocol", value: "HTTPS — Encrypted" });
  } else if (parsed.protocol === "http:") {
    warnings.push("Not encrypted (HTTP) — your data can be intercepted in transit");
    evidence.push({ type: "negative", label: "Protocol", value: "HTTP — Unencrypted" });
    bump("caution");
  }
  if (url.startsWith("data:")) {
    warnings.push("Embedded data URI — could contain malicious scripts or hidden content");
    evidence.push({ type: "negative", label: "URI Type", value: "Data URI — Potentially Malicious" });
    bump("dangerous");
  }
  if (url.startsWith("javascript:")) {
    warnings.push("JavaScript URI — could execute malicious code on your device");
    evidence.push({ type: "negative", label: "URI Type", value: "JavaScript URI — Code Execution Risk" });
    bump("dangerous");
  }

  // ── IP address ────────────────────────────────────────────────────────────
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    warnings.push("URL uses a raw IP address instead of a domain name — extremely suspicious");
    evidence.push({ type: "negative", label: "Host Type", value: "Raw IP Address — No Domain" });
    bump("dangerous");
  } else if (hostname.startsWith("[")) {
    warnings.push("URL uses IPv6 address — uncommon for legitimate links");
    evidence.push({ type: "negative", label: "Host Type", value: "IPv6 Address — Unusual" });
    bump("caution");
  } else {
    evidence.push({ type: "positive", label: "Host Type", value: "Named Domain" });
  }

  // ── URL shortener ─────────────────────────────────────────────────────────
  if (URL_SHORTENERS.has(hostname) || [...URL_SHORTENERS].some((s) => hostname.endsWith("." + s))) {
    warnings.push("Shortened URL — the actual destination is hidden from you");
    evidence.push({ type: "negative", label: "URL Shortener", value: "Destination Masked" });
    bump("caution");
  }

  // ── TLD ───────────────────────────────────────────────────────────────────
  const tld = "." + hostname.split(".").slice(-1)[0];
  if (SUSPICIOUS_TLDS.has(tld)) {
    warnings.push(`Domain uses "${tld}" — a free/abused TLD commonly used for scams`);
    evidence.push({ type: "negative", label: "Domain TLD", value: `${tld} — High-Risk Extension` });
    bump("caution");
  } else {
    evidence.push({ type: "positive", label: "Domain TLD", value: `${tld} — Standard Extension` });
  }

  // ── Brand impersonation ───────────────────────────────────────────────────
  let brandFlagged = false;
  for (const brand of BRAND_IMPERSONATION_KEYWORDS) {
    if (brand.length <= 3) continue;
    if (!hostname.includes(brand)) continue;
    const officialDomains = BRAND_OFFICIAL_DOMAINS[brand] || [];
    if (officialDomains.length === 0) continue;
    const isOfficial = officialDomains.some((d) => hostname === d || hostname.endsWith("." + d));
    if (!isOfficial) {
      const rootDomain = hostname.split(".").slice(-2).join(".");
      const officialRoots = officialDomains.map((d) => d.split(".").slice(-2).join("."));
      if (officialRoots.includes(rootDomain)) continue;
      warnings.push(`Domain contains "${brand}" but is NOT the official site — likely phishing`);
      evidence.push({ type: "negative", label: "Brand Check", value: `"${brand}" — Impersonation Detected` });
      bump("dangerous");
      brandFlagged = true;
      break;
    } else {
      evidence.push({ type: "positive", label: "Brand Check", value: `${brand.charAt(0).toUpperCase() + brand.slice(1)} — Official Domain` });
      brandFlagged = true;
      break;
    }
  }

  // ── Subdomain depth ───────────────────────────────────────────────────────
  const domainParts = hostname.split(".");
  if (domainParts.length > 4) {
    warnings.push("Excessive subdomains — a common trick to disguise the real domain");
    evidence.push({ type: "negative", label: "Subdomain Depth", value: `${domainParts.length} Levels — Suspicious` });
    bump("caution");
  } else if (domainParts.length <= 3) {
    evidence.push({ type: "positive", label: "Subdomain Depth", value: "Normal Structure" });
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
        evidence.push({ type: "negative", label: "Subdomain Brand", value: `"${brand}" Mismatch — Root: ${rootDomain}` });
        bump("dangerous");
        break;
      }
    }
  }

  // ── Sensitive path ────────────────────────────────────────────────────────
  let pathFlagged = false;
  for (const kw of SENSITIVE_PATH_KEYWORDS) {
    if (pathAndQuery.includes(kw)) {
      warnings.push(`URL path contains "${kw}" — be very careful about entering personal details`);
      evidence.push({ type: "negative", label: "Path Pattern", value: `"${kw}" — Phishing Indicator` });
      bump("caution");
      pathFlagged = true;
      break;
    }
  }
  if (!pathFlagged) {
    evidence.push({ type: "positive", label: "Path Pattern", value: "No Known Phishing Paths" });
  }

  // ── Redirect params ───────────────────────────────────────────────────────
  const redirectParams = ["redirect_uri", "return_url", "returnurl", "callback_url"];
  for (const p of redirectParams) {
    if (parsed.searchParams.has(p)) {
      const val = parsed.searchParams.get(p) || "";
      if (val.startsWith("http")) {
        warnings.push("URL contains a redirect to another site — final destination may be harmful");
        evidence.push({ type: "negative", label: "Redirect Chain", value: "Contains External Redirect" });
        bump("caution");
        break;
      }
    }
  }

  // ── URL length ────────────────────────────────────────────────────────────
  if (url.length > 400) {
    warnings.push("Extremely long URL — often used to hide the real destination");
    evidence.push({ type: "negative", label: "URL Length", value: `${url.length} chars — Unusually Long` });
    bump("caution");
  } else {
    evidence.push({ type: "positive", label: "URL Length", value: `${url.length} chars — Normal` });
  }

  // ── Punycode / IDN ────────────────────────────────────────────────────────
  if (hostname.includes("xn--")) {
    warnings.push("Domain uses international characters (Punycode) — could visually impersonate a legitimate site");
    evidence.push({ type: "negative", label: "Domain Encoding", value: "Punycode (IDN) — Impersonation Risk" });
    bump("dangerous");
  } else {
    evidence.push({ type: "positive", label: "Domain Encoding", value: "Standard ASCII" });
  }

  // ── @ in URL ──────────────────────────────────────────────────────────────
  if (url.includes("@") && !url.includes("mailto:") && riskLevel !== "safe") {
    const atCount = (url.match(/@/g) || []).length;
    const isKnownEmail = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].some((d) => hostname.endsWith(d));
    if (atCount > 0 && !isKnownEmail) {
      warnings.push("URL contains '@' — could be hiding the real destination");
      evidence.push({ type: "negative", label: "URL Structure", value: "'@' Symbol — Destination Misdirection" });
      bump("dangerous");
    }
  }

  return { isSuspicious: warnings.length > 0, warnings, riskLevel, evidence };
}
