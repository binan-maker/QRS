import type { ParsedPaymentQr } from "../types";

export { isPaymentQr, parseAnyPaymentQr };
export type { ParsedPaymentQr };

const UPI_SCHEMES = [
  "upi://pay",
  "upi://",
  "tez://upi",
  "gpay://upi",
  "phonepe://pay",
  "phonepe://upi",
  "paytmmp://pay",
  "paytm://",
  "bhim://",
];

const CRYPTO_SCHEMES: Record<string, string> = {
  "bitcoin:": "Bitcoin",
  "ethereum:": "Ethereum",
  "eth:": "Ethereum",
  "solana:": "Solana",
  "litecoin:": "Litecoin",
  "bitcoincash:": "Bitcoin Cash",
  "monero:": "Monero",
  "dogecoin:": "Dogecoin",
  "bnb:": "BNB",
  "tron:": "TRON",
};

function isPaymentQr(content: string): boolean {
  return parseAnyPaymentQr(content) !== null;
}

function parseUpiParams(content: string): ParsedPaymentQr | null {
  let pa = "";
  let pn = "";
  let am: string | undefined;
  let tn: string | undefined;
  let cu = "INR";

  try {
    const urlLike = content.includes("://")
      ? content
      : `upi://pay?${content.includes("?") ? content.split("?")[1] : content}`;
    const search = urlLike.split("?")[1] || "";
    const params = new URLSearchParams(search);

    pa = params.get("pa") || "";
    pn = params.get("pn") || "";
    am = params.get("am") || params.get("amount") || undefined;
    tn = params.get("tn") || params.get("note") || undefined;
    cu = params.get("cu") || "INR";
  } catch {
    // fallback regex extraction
  }

  if (!pa) {
    const paMatch = content.match(/[?&]pa=([^&\s]+)/i);
    if (paMatch) {
      pa = decodeURIComponent(paMatch[1]);
    }
  }

  if (!pa) return null;

  const bankHandle = pa.includes("@") ? pa.split("@")[1].toLowerCase() : "";
  const isAmountPreFilled = !!am && parseFloat(am) > 0;

  return {
    app: "upi",
    appDisplayName: "UPI Payment",
    appCategory: "upi_india",
    region: "India",
    recipientId: pa,
    recipientName: pn ? decodeURIComponent(pn).replace(/\+/g, " ") : undefined,
    amount: am,
    currency: cu,
    note: tn ? decodeURIComponent(tn).replace(/\+/g, " ") : undefined,
    rawContent: content,
    isAmountPreFilled,
    bankHandle,
    vpa: pa,
  };
}

function parseCryptoQr(content: string, lower: string): ParsedPaymentQr | null {
  for (const [scheme, name] of Object.entries(CRYPTO_SCHEMES)) {
    if (lower.startsWith(scheme)) {
      let address = content.slice(scheme.length).split("?")[0].split("/")[0].trim();
      let amount: string | undefined;

      try {
        const qIdx = content.indexOf("?");
        if (qIdx >= 0) {
          const params = new URLSearchParams(content.slice(qIdx + 1));
          amount = params.get("amount") || params.get("value") || undefined;
        }
      } catch {}

      return {
        app: scheme.replace(":", ""),
        appDisplayName: name,
        appCategory: "crypto",
        region: "Global",
        recipientId: address,
        amount,
        currency: name,
        rawContent: content,
        isAmountPreFilled: !!amount,
        coinType: scheme.replace(":", ""),
      };
    }
  }
  return null;
}

function parseEmvQr(content: string): ParsedPaymentQr {
  // Fast EMVCo tag extraction for tag 59 (merchant), 54 (amount), 53 (currency)
  let merchantName = "";
  let amount: string | undefined;
  let currency = "INR";
  let vpa = "";

  try {
    let i = 0;
    while (i + 4 <= content.length) {
      const id = content.slice(i, i + 2);
      const len = parseInt(content.slice(i + 2, i + 4), 10);
      if (isNaN(len) || len < 0 || i + 4 + len > content.length) break;
      const val = content.slice(i + 4, i + 4 + len);

      if (id === "59") merchantName = val;
      if (id === "54" && parseFloat(val) > 0) amount = val;
      if (id === "53") currency = val === "356" ? "INR" : val;

      // Tag 26-51 subtemplates for UPI VPA
      const tagNum = parseInt(id, 10);
      if (tagNum >= 26 && tagNum <= 51 && val.includes("@")) {
        const match = val.match(/[a-zA-Z0-9.\-_]{2,60}@[a-zA-Z0-9.\-_]+/);
        if (match) vpa = match[0];
      }
      i += 4 + len;
    }
  } catch {}

  const recipientId = vpa || merchantName || "BharatQR Payment";
  const bankHandle = vpa?.includes("@") ? vpa.split("@")[1].toLowerCase() : undefined;

  return {
    app: vpa ? "upi" : "emv_generic",
    appDisplayName: "Payment QR",
    appCategory: vpa ? "upi_india" : "emv",
    region: "India",
    recipientId,
    recipientName: merchantName || undefined,
    amount,
    currency,
    rawContent: content,
    isAmountPreFilled: !!amount,
    bankHandle,
    vpa: vpa || undefined,
    isEmv: true,
  };
}

function parseAnyPaymentQr(content: string): ParsedPaymentQr | null {
  if (!content) return null;
  const lower = content.toLowerCase().trim();

  // 1. UPI Deeplink Check
  for (const scheme of UPI_SCHEMES) {
    if (lower.startsWith(scheme)) {
      return parseUpiParams(content);
    }
  }

  // 2. EMVCo / BharatQR Prefix Check
  if (lower.startsWith("000201")) {
    return parseEmvQr(content);
  }

  // 3. Crypto Scheme Check
  const crypto = parseCryptoQr(content, lower);
  if (crypto) return crypto;

  // 4. Fallback: Contains pa= parameter with @ symbol
  if (lower.includes("pa=") && lower.includes("@")) {
    return parseUpiParams(content);
  }

  return null;
}
