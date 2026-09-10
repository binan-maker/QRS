/**
 * URL risk scoring — security analysis layer.
 * Scores a URL string for phishing indicators, IP usage, shorteners, and
 * suspicious keywords. Used in QR generation preview and elsewhere.
 */

export interface UrlRiskResult {
  score: number;
  reasons: string[];
}

const URL_SHORTENERS = /bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|short\.gy|rb\.gy|is\.gd|buff\.ly|ift\.tt/i;
const IP_PATTERN = /^https?:\/\/(\d{1,3}\.){3}\d{1,3}/;
const PHISHING_BRANDS = [
  { pattern: /paypal/i,     domain: "paypal.com"    },
  { pattern: /amazon/i,     domain: "amazon.com"    },
  { pattern: /google/i,     domain: "google.com"    },
  { pattern: /apple/i,      domain: "apple.com"     },
  { pattern: /microsoft/i,  domain: "microsoft.com" },
  { pattern: /netflix/i,    domain: "netflix.com"   },
  { pattern: /hdfc/i,       domain: "hdfcbank.com"  },
  { pattern: /sbi/i,        domain: "sbi.co.in"     },
  { pattern: /paytm/i,      domain: "paytm.com"     },
  { pattern: /phonepe/i,    domain: "phonepe.com"   },
];

export function computeUrlRisk(value: string): UrlRiskResult {
  const reasons: string[] = [];
  let score = 0;

  if (!value || value.startsWith("upi://") || value.startsWith("WIFI:") ||
      value.startsWith("BEGIN:") || value.startsWith("tel:") ||
      value.startsWith("mailto:") || value.startsWith("geo:") ||
      value.startsWith("SMSTO:")) {
    return { score: 0, reasons: [] };
  }

  if (value.startsWith("http://") && !value.startsWith("https://")) {
    score += 35;
    reasons.push("Insecure (HTTP)");
  }

  if (IP_PATTERN.test(value)) {
    score += 55;
    reasons.push("Direct IP address");
  }

  if (URL_SHORTENERS.test(value)) {
    score += 45;
    reasons.push("URL shortener");
  }

  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    const hostname = url.hostname.toLowerCase();

    for (const brand of PHISHING_BRANDS) {
      if (brand.pattern.test(hostname) && !hostname.endsWith(brand.domain)) {
        score += 80;
        reasons.push(`Possible ${brand.domain.split(".")[0]} phishing`);
        break;
      }
    }

    if ((hostname.match(/\./g) || []).length > 3) {
      score += 15;
      reasons.push("Unusual subdomain depth");
    }

    const suspiciousKeywords = /secure|verify|update|login|signin|account|bank|confirm|wallet/i;
    if (suspiciousKeywords.test(hostname) && !hostname.endsWith(".gov.in") && !hostname.endsWith(".org")) {
      score += 20;
      reasons.push("Suspicious keywords in domain");
    }
  } catch {
    // unparseable URL — leave score as-is
  }

  return {
    score: Math.min(score, 100),
    reasons,
  };
}
