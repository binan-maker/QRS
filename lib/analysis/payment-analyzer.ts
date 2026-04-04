import type { ParsedPaymentQr, PaymentSafetyResult, ParsedUpiQr, Evidence } from "./types";
import { parseAnyPaymentQr } from "./payment-parser";

export function analyzeAnyPaymentQr(parsed: ParsedPaymentQr): PaymentSafetyResult {
  const warnings: string[] = [];
  const evidence: Evidence[] = [];
  let riskLevel: "safe" | "caution" | "dangerous" = "safe";

  function bump(level: "caution" | "dangerous") {
    if (level === "dangerous") riskLevel = "dangerous";
    else if (riskLevel === "safe") riskLevel = "caution";
  }

  // ── Payment app info ──────────────────────────────────────────────────────
  evidence.push({ type: "info", label: "Payment Network", value: parsed.appDisplayName });
  if (parsed.region) {
    evidence.push({ type: "info", label: "Region", value: parsed.region });
  }

  // ── Crypto: irreversible transactions ─────────────────────────────────────
  if (parsed.appCategory === "crypto") {
    warnings.push(`Crypto payment (${parsed.appDisplayName}) — transactions are irreversible once sent`);
    warnings.push("Verify the wallet address character by character before sending any funds");
    evidence.push({ type: "negative", label: "Transaction Type", value: "Crypto — Irreversible Once Sent" });

    if (parsed.isAmountPreFilled && parsed.amount) {
      const amt = parseFloat(parsed.amount);
      if (amt > 0) {
        warnings.push(`Pre-filled amount: ${parsed.currency || ""} ${amt.toLocaleString()} — confirm before sending`);
        evidence.push({ type: "negative", label: "Pre-Filled Amount", value: `${parsed.currency || ""} ${amt.toLocaleString()} — Verify Before Sending` });
      }
    }

    const addr = parsed.recipientId;
    if (addr && (addr.length < 20 || addr.length > 120)) {
      warnings.push("Wallet address length looks unusual — double check before sending");
      evidence.push({ type: "negative", label: "Wallet Address", value: `${addr.length} chars — Unusual Length` });
      bump("dangerous");
    } else if (addr) {
      evidence.push({ type: "neutral", label: "Wallet Address", value: `${addr.slice(0, 8)}…${addr.slice(-6)}` });
    }

    bump("caution");
    return { isSuspicious: true, warnings, riskLevel, appInfo: parsed.appDisplayName, evidence };
  }

  // ── Recipient info ────────────────────────────────────────────────────────
  if (parsed.recipientName) {
    evidence.push({ type: "info", label: "Recipient Name", value: parsed.recipientName });
  }
  if (parsed.vpa) {
    const handle = parsed.vpa.split("@")[1] || parsed.vpa;
    evidence.push({ type: "info", label: "VPA Handle", value: `@${handle}` });
  } else if (parsed.recipientId) {
    evidence.push({ type: "neutral", label: "Recipient ID", value: parsed.recipientId.length > 24
      ? `${parsed.recipientId.slice(0, 12)}…${parsed.recipientId.slice(-6)}`
      : parsed.recipientId });
  }

  // ── Pre-filled amount ─────────────────────────────────────────────────────
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
      evidence.push({ type: "negative", label: "Pre-Filled Amount", value: `${formattedAmt} — Verify Before Paying` });
      bump("caution");
    }
  } else {
    evidence.push({ type: "positive", label: "Amount", value: "Not Pre-Filled — You Control the Amount" });
  }

  // ── Transaction note ──────────────────────────────────────────────────────
  if (parsed.note) {
    evidence.push({ type: "neutral", label: "Transaction Note", value: parsed.note.length > 40 ? `${parsed.note.slice(0, 40)}…` : parsed.note });
  }

  return {
    isSuspicious: warnings.length > 0,
    warnings,
    riskLevel,
    appInfo: parsed.appDisplayName,
    evidence,
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
