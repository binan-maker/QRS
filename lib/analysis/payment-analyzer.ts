import type { ParsedPaymentQr, PaymentSafetyResult, ParsedUpiQr } from "./types";
import { parseAnyPaymentQr } from "./payment-parser";

const VALID_UPI_HANDLES = new Set([
  // Google Pay official handles
  "okaxis", "okhdfcbank", "okicici", "oksbi",
  // PhonePe official handles
  "ybl", "ibl", "axl",
  // Paytm
  "paytm", "paytmbank",
  // HDFC Bank
  "hdfcbank", "payzapp", "hdfcbankjd",
  // ICICI Bank / iMobile
  "icici", "icicibank", "okicici", "tapicici",
  // SBI / YONO
  "sbi",
  // Axis Bank / Axis Pay
  "axisbank", "axl",
  // Kotak / Kotak 811
  "kotak", "kmbl",
  // IndusInd / IndusPay
  "indus",
  // IDBI
  "idbi",
  // Federal Bank / Fi
  "federal", "fbl",
  // RBL
  "rbl", "rblbank",
  // PNB
  "pnb",
  // Bank of Baroda / BOB World
  "bob", "barodampay",
  // Canara Bank
  "cnrb",
  // Indian Bank
  "indianbank",
  // Union Bank
  "uboi", "ucobank", "uco",
  // Airtel Payments Bank
  "airtel", "airtelpe",
  // Jio Payments Bank
  "jio",
  // JusPay
  "juspay",
  // FreeCharge (Axis)
  "freecharge",
  // MobiKwik
  "mobikwik",
  // Amazon Pay
  "yapl", "apl", "amazonpay",
  // CRED
  "cred",
  // Navi
  "naviaxis", "navi",
  // Slice
  "sliceaxis", "abfspay",
  // Groww
  "groww",
  // Jupiter
  "jupiterpay",
  // IDFC FIRST Bank
  "idfcbank", "idfcfirst",
  // Yes Bank / Yes Pay
  "yesbank", "yesbankltd",
  // AU Small Finance Bank
  "aubank",
  // Various small bank/NBFC handles
  "timecosmos", "postbank",
  "rajgovhdfcbank", "dlb", "mahb",
  "kvb", "sib", "cbin",
  "cub", "dcb",
  "equitas", "esaf", "fino",
  "idfc", "ikwik",
  "ubi", "vijb",
  "myicici",
  "pingpay",
  "qb", "saraswat",
  "scb", "scmb", "shriramhfl",
  "tjsb", "ujjivan",
  "utbi", "zoicici", "waaxis",
  "ptaxis", "pthdfc", "ptyes",
  "abhy",
  "bhanix", "bdbl", "bypl",
  "cmsidfc", "csb", "dnsbank",
  "hsbc", "iob",
  "jkb", "karb", "kbl",
  "lvb", "mahagrambank", "nkgsb",
  "zinghr", "superyes",
  "bajajpay", "razorpay",
  "bhim",
  "nsdl",
  "upi",
]);

// Only flag genuinely scam-specific keywords — NOT payment brand names
// (Google, Paytm, Amazon, PhonePe users can legitimately have those names)
const UPI_SCAM_KEYWORDS = [
  "income tax", "incometax",
  "lottery", "winner", "prize", "jackpot",
  "pm india", "pmkisan", "modi",
  "helpline", "toll free", "tollfree",
  "uidai", "aadhar refund",
  "customs", "customs duty",
  "covid relief", "covid fund",
  "cyber crime", "cybercrime",
  "arrest warrant", "police notice",
  "cbi notice", "ed notice",
];

export function analyzeAnyPaymentQr(parsed: ParsedPaymentQr): PaymentSafetyResult {
  const warnings: string[] = [];
  let riskLevel: "safe" | "caution" | "dangerous" = "safe";

  function bump(level: "caution" | "dangerous") {
    if (level === "dangerous") riskLevel = "dangerous";
    else if (riskLevel === "safe") riskLevel = "caution";
  }

  // ── Crypto: irreversible, always needs care ───────────────────────────────
  if (parsed.appCategory === "crypto") {
    warnings.push(`Crypto payment: ${parsed.appDisplayName} — transactions are irreversible`);
    warnings.push("Verify the wallet address character by character — one wrong digit means lost funds forever");
    if (parsed.isAmountPreFilled) {
      warnings.push("Pre-filled amount detected — only pay if you intended this");
    }
    const addr = parsed.recipientId;
    if (addr && (addr.length < 20 || addr.length > 120)) {
      warnings.push("Wallet address length looks unusual — double check before sending");
      bump("dangerous");
    }
    bump("caution");
    return { isSuspicious: true, warnings, riskLevel, appInfo: parsed.appDisplayName };
  }

  // ── UPI / Indian bank payments ─────────────────────────────────────────────
  if (parsed.appCategory === "upi_india" || parsed.appCategory === "india_wallet") {
    const bankHandle = (parsed.bankHandle || "").toLowerCase();

    // Unknown handle — mild caution only, don't call dangerous
    if (bankHandle && !VALID_UPI_HANDLES.has(bankHandle)) {
      warnings.push(`Bank handle "@${bankHandle}" is not in our verified list — confirm the UPI ID before paying`);
      bump("caution");
    }

    // Check recipient name only for REAL scam keywords — not brand names
    if (parsed.recipientName) {
      const lowerName = parsed.recipientName.toLowerCase();
      for (const kw of UPI_SCAM_KEYWORDS) {
        if (lowerName.includes(kw)) {
          warnings.push(`Payee name contains "${kw}" — this is a common pattern in UPI scams. Do not pay.`);
          bump("dangerous");
          break;
        }
      }
    }

    // Large pre-filled amounts still warrant a note
    if (parsed.isAmountPreFilled && parsed.amount) {
      const amt = parseFloat(parsed.amount);
      if (amt > 50000) {
        warnings.push(`Large pre-filled amount: ₹${amt.toLocaleString("en-IN")} — only pay if YOU initiated this`);
        bump("caution");
      } else if (amt > 0) {
        warnings.push(`Amount pre-filled: ₹${amt.toLocaleString("en-IN")} — confirm before paying`);
      }
    }

    // Very long VPA local part (>40 chars is genuinely unusual for merchants)
    const vpaLocal = (parsed.vpa || parsed.recipientId || "").split("@")[0];
    if (vpaLocal.length > 40) {
      warnings.push("VPA identifier is unusually long — auto-generated VPAs are sometimes used in scams");
      bump("caution");
    }
  }

  // ── Global wallets (PayPal, Cash App, Venmo, etc.) ────────────────────────
  if (["global_wallet", "us_payment"].includes(parsed.appCategory)) {
    if (!parsed.recipientId) {
      warnings.push(`No recipient ID found in ${parsed.appDisplayName} QR`);
      bump("caution");
    }
    if (parsed.isAmountPreFilled && parsed.amount) {
      warnings.push(`Pre-filled amount in ${parsed.appDisplayName} — verify the exact recipient before sending`);
      bump("caution");
    }
  }

  // ── South-East Asia / regional payments ───────────────────────────────────
  if (["southeast_asia", "korea", "japan", "singapore_malaysia", "thailand"].includes(parsed.appCategory)) {
    if (!parsed.recipientId || parsed.recipientId.trim().length < 4) {
      warnings.push(`Recipient ID is missing or very short in ${parsed.appDisplayName} QR`);
      bump("caution");
    }
    if (parsed.isAmountPreFilled) {
      warnings.push("Pre-set amount detected — confirm the payee and amount before proceeding");
      bump("caution");
    }
  }

  // ── SEPA bank transfer ────────────────────────────────────────────────────
  if (parsed.app === "sepa_transfer") {
    if (!parsed.recipientId) {
      warnings.push("IBAN not found in SEPA QR — invalid format");
      bump("caution");
    }
    if (parsed.amount && parseFloat(parsed.amount) > 5000) {
      warnings.push(`Large SEPA transfer: €${parseFloat(parsed.amount).toFixed(2)} — verify before authorizing`);
      bump("caution");
    }
  }

  // ── Generic EMV QR ────────────────────────────────────────────────────────
  if (parsed.app === "emv_generic") {
    warnings.push("Generic payment QR — confirm the payment network and merchant before paying");
    bump("caution");
  }

  // ── Completely unknown payment QR ─────────────────────────────────────────
  if (parsed.app === "unknown_payment" || parsed.appCategory === "other") {
    warnings.push("Payment QR from an app we don't recognize — verify the merchant before paying");
    if (parsed.isAmountPreFilled && parsed.amount) {
      const amt = parseFloat(parsed.amount);
      if (amt > 0) {
        warnings.push(`Pre-filled amount: ${parsed.currency || ""} ${amt.toLocaleString()} — only pay if YOU initiated this`);
        bump(amt > 50000 ? "dangerous" : "caution");
      }
    }
    if (!parsed.recipientId || parsed.recipientId.length < 3) {
      warnings.push("No recipient ID found — do not pay without verifying who receives the money");
      bump("caution");
    }
    bump("caution");
  }

  // ── China / Alipay / WeChat Pay ───────────────────────────────────────────
  if (parsed.appCategory === "china") {
    warnings.push(`${parsed.appDisplayName} QR — verify you are paying the correct merchant`);
    bump("caution");
  }

  // ── Pix (Brazil) ──────────────────────────────────────────────────────────
  if (parsed.app === "pix") {
    if (parsed.isAmountPreFilled && parsed.amount) {
      const amt = parseFloat(parsed.amount);
      if (amt > 1000) {
        warnings.push(`Pix transfer: R$${amt.toFixed(2)} — Pix is instant and irreversible, confirm the key`);
        bump("caution");
      }
    }
  }

  return {
    isSuspicious: warnings.length > 0,
    warnings,
    riskLevel,
    appInfo: parsed.appDisplayName,
  };
}

export function parseUpiQr(content: string): ParsedUpiQr | null {
  const parsed = parseAnyPaymentQr(content);
  if (!parsed || parsed.appCategory !== "upi_india") return null;
  return {
    vpa: parsed.vpa || parsed.recipientId,
    payeeName: parsed.recipientName || "",
    amount: parsed.amount || null,
    currency: parsed.currency || "INR",
    transactionNote: parsed.note || null,
    merchantCategory: null,
    bankHandle: parsed.bankHandle || "",
    isAmountPreFilled: parsed.isAmountPreFilled,
  };
}

export function analyzePaymentQr(parsed: ParsedUpiQr): PaymentSafetyResult {
  const universal: ParsedPaymentQr = {
    app: "upi",
    appDisplayName: "UPI",
    appCategory: "upi_india",
    region: "India",
    recipientId: parsed.vpa,
    recipientName: parsed.payeeName,
    amount: parsed.amount || undefined,
    currency: parsed.currency,
    note: parsed.transactionNote || undefined,
    rawContent: "",
    isAmountPreFilled: parsed.isAmountPreFilled,
    bankHandle: parsed.bankHandle,
    vpa: parsed.vpa,
  };
  return analyzeAnyPaymentQr(universal);
}
