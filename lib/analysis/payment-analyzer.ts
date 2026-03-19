import type { ParsedPaymentQr, PaymentSafetyResult, ParsedUpiQr } from "./types";
import { parseAnyPaymentQr } from "./payment-parser";

export function analyzeAnyPaymentQr(parsed: ParsedPaymentQr): PaymentSafetyResult {
  const warnings: string[] = [];
  let riskLevel: "safe" | "caution" | "dangerous" = "safe";

  function bump(level: "caution" | "dangerous") {
    if (level === "dangerous") riskLevel = "dangerous";
    else if (riskLevel === "safe") riskLevel = "caution";
  }

  // ── Crypto: irreversible transactions — factual, always shown ─────────────
  if (parsed.appCategory === "crypto") {
    warnings.push(`Crypto payment (${parsed.appDisplayName}) — transactions are irreversible once sent`);
    warnings.push("Verify the wallet address character by character before sending any funds");
    if (parsed.isAmountPreFilled && parsed.amount) {
      const amt = parseFloat(parsed.amount);
      if (amt > 0) {
        warnings.push(`Pre-filled amount: ${parsed.currency || ""} ${amt.toLocaleString()} — confirm before sending`);
      }
    }
    const addr = parsed.recipientId;
    if (addr && (addr.length < 20 || addr.length > 120)) {
      warnings.push("Wallet address length looks unusual — double check before sending");
      bump("dangerous");
    }
    bump("caution");
    return { isSuspicious: true, warnings, riskLevel, appInfo: parsed.appDisplayName };
  }

  // ── Pre-filled amount: always shown, even for 1 rupee or 1 cent ───────────
  if (parsed.isAmountPreFilled && parsed.amount) {
    const amt = parseFloat(parsed.amount);
    if (amt > 0) {
      let formattedAmt: string;
      if (parsed.appCategory === "upi_india" || parsed.appCategory === "india_wallet") {
        formattedAmt = `₹${amt.toLocaleString("en-IN")}`;
      } else if (parsed.app === "pix") {
        formattedAmt = `R$${amt.toFixed(2)}`;
      } else if (parsed.app === "sepa_transfer") {
        formattedAmt = `€${amt.toFixed(2)}`;
      } else {
        const currency = parsed.currency ? `${parsed.currency} ` : "";
        formattedAmt = `${currency}${amt.toLocaleString()}`;
      }
      warnings.push(`Pre-filled amount: ${formattedAmt} — confirm the amount before paying`);
      bump("caution");
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
