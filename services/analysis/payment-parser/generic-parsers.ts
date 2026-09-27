import type { ParsedPaymentQr } from "../types";
import type { AppDef } from "./registry";
import { parseUnknownUpiQr, parseUpiContent, formatSchemeName } from "./upi-parsers";

export function parseCryptoContent(app: AppDef, content: string): ParsedPaymentQr {
  let address = content, amount: string | undefined;
  try {
    const colonIdx = content.indexOf(":");
    if (colonIdx >= 0) {
      address = content.slice(colonIdx + 1).split("?")[0].split("/")[0];
      const qIdx = content.indexOf("?");
      if (qIdx >= 0) {
        const params = new URLSearchParams(content.slice(qIdx + 1));
        amount = params.get("amount") || params.get("value") || undefined;
      }
    }
  } catch {}
  return { app: app.id, appDisplayName: app.displayName, appCategory: "crypto", region: app.region, recipientId: address, amount, rawContent: content, isAmountPreFilled: !!amount, coinType: app.id };
}

export function parseGenericPayment(app: AppDef, content: string, lower: string): ParsedPaymentQr {
  let recipientId = "", amount: string | undefined;
  if (lower.includes("paypal.me/")) {
    recipientId = content.split("paypal.me/")[1]?.split("?")[0]?.split("/")[0] || "";
    amount = new URLSearchParams(content.split("?")[1] || "").get("amount") || undefined;
  } else if (lower.includes("cash.app/$")) {
    recipientId = "$" + (content.split("cash.app/$")[1]?.split("?")[0] || "");
    amount = new URLSearchParams(content.split("?")[1] || "").get("amount") || undefined;
  } else if (lower.includes("venmo.com")) {
    recipientId = content.split("venmo.com/u/")[1]?.split("?")[0] || "";
  } else if (lower.includes("revolut.me/")) {
    recipientId = content.split("revolut.me/")[1]?.split("?")[0] || "";
    amount = new URLSearchParams(content.split("?")[1] || "").get("amount") || undefined;
  } else if (lower.includes("tikkie.me/")) {
    recipientId = content.split("tikkie.me/")[1]?.split("?")[0] || "";
  } else if (lower.includes("picpay.me/")) {
    recipientId = content.split("picpay.me/")[1]?.split("?")[0] || "";
  } else {
    recipientId = content.slice(0, 60);
  }
  return { app: app.id, appDisplayName: app.displayName, appCategory: app.category, region: app.region, recipientId, amount, rawContent: content, isAmountPreFilled: !!amount };
}

export function buildParsedPayment(app: AppDef, content: string, lower: string): ParsedPaymentQr {
  try {
    if (app.category === "upi_india") return parseUpiContent(app, content);
    if (app.category === "crypto") return parseCryptoContent(app, content);
    return parseGenericPayment(app, content, lower);
  } catch {
    return parseGenericPayment(app, content, lower);
  }
}

export function parseUrlPaymentQr(content: string, lower: string): ParsedPaymentQr {
  let amount: string | undefined, recipientId = "", recipientName: string | undefined,
    vpa: string | undefined, bankHandle: string | undefined, note: string | undefined;
  let appName = "Payment", appId: ParsedPaymentQr["app"] = "unknown_payment";
  let appCategory: ParsedPaymentQr["appCategory"] = "other", region = "Regional";
  try {
    const urlObj = new URL(content);
    const hostname = urlObj.hostname.replace(/^www\./, "");
    appName = hostname.replace(/^pay\./, "").split(".")[0];
    appName = appName.charAt(0).toUpperCase() + appName.slice(1) + " Pay";
    amount = urlObj.searchParams.get("amount") || urlObj.searchParams.get("am") || urlObj.searchParams.get("amt") || undefined;
    const pa = urlObj.searchParams.get("pa") || urlObj.searchParams.get("vpa");
    const pn = urlObj.searchParams.get("pn") || urlObj.searchParams.get("name");
    note = urlObj.searchParams.get("tn") || urlObj.searchParams.get("note") || undefined;
    if (pa) {
      recipientId = pa; vpa = pa; bankHandle = pa.includes("@") ? pa.split("@")[1] : undefined;
      appCategory = "upi_india"; region = "India"; appId = "upi";
    } else {
      recipientId = urlObj.searchParams.get("to") || urlObj.searchParams.get("merchant") || urlObj.pathname.split("/").pop() || "";
      if (recipientId.includes("@")) { vpa = recipientId; bankHandle = recipientId.split("@")[1]; appCategory = "upi_india"; region = "India"; appId = "upi"; }
    }
    if (pn) recipientName = decodeURIComponent(pn);
    if (!recipientId) recipientId = content.slice(0, 60);
  } catch {
    recipientId = content.slice(0, 60);
    const atMatch = content.match(/[\w.+-]+@[\w.]+/);
    if (atMatch) { vpa = atMatch[0]; recipientId = atMatch[0]; bankHandle = atMatch[0].split("@")[1]; appCategory = "upi_india"; region = "India"; appId = "upi"; }
  }
  return { app: appId, appDisplayName: appName, appCategory, region, recipientId, recipientName, amount, rawContent: content, isAmountPreFilled: !!amount && parseFloat(amount) > 0, vpa, bankHandle, note };
}

export function parseRawFieldPaymentQr(content: string, lower: string): ParsedPaymentQr {
  let amount: string | undefined, recipientId = "", recipientName: string | undefined, vpa: string | undefined, bankHandle: string | undefined;
  const amMatch = content.match(/(?:amount|am|amt|price)\s*[=:]\s*([\d.]+)/i);
  if (amMatch) amount = amMatch[1];
  const payeeMatch = content.match(/(?:pa|vpa|payee|merchant)\s*[=:]\s*([^\s|&,]+)/i);
  if (payeeMatch) recipientId = payeeMatch[1];
  const nameMatch = content.match(/(?:pn|name|payeename|merchantname)\s*[=:]\s*([^|&,\n]+)/i);
  if (nameMatch) recipientName = decodeURIComponent(nameMatch[1].trim());
  if (!recipientId) {
    const atMatch = content.match(/[\w.+-]+@[\w.]+/);
    if (atMatch) recipientId = atMatch[0];
  }
  if (recipientId.includes("@")) { vpa = recipientId; bankHandle = recipientId.split("@")[1]; }
  const isIndia = !!(vpa || lower.includes("inr") || lower.includes("₹") || lower.includes("upi"));
  return {
    app: isIndia ? "upi" : "unknown_payment", appDisplayName: isIndia ? "UPI Payment" : "Payment QR",
    appCategory: isIndia ? "upi_india" : "other", region: isIndia ? "India" : "Regional",
    recipientId: recipientId || content.slice(0, 60), recipientName, amount,
    rawContent: content, isAmountPreFilled: !!amount && parseFloat(amount) > 0, vpa, bankHandle,
  };
}

export function detectUniversalPayment(content: string, lower: string): ParsedPaymentQr | null {
  if (lower.includes("pa=")) return parseUnknownUpiQr(content, lower, "UPI Payment");
  const schemeMatch = content.match(/^([a-zA-Z][a-zA-Z0-9+\-.]{2,}):\/\//);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    const rest = lower.slice(schemeMatch[0].length);
    const isPaymentScheme =
      scheme.includes("pay") || scheme.includes("upi") || scheme.includes("wallet") ||
      scheme.includes("money") || scheme.includes("bank") || scheme.includes("cash") ||
      rest.startsWith("pay") || rest.startsWith("upi") || rest.startsWith("payment") || rest.startsWith("transfer");
    if (isPaymentScheme) return parseSchemePaymentQrLocal(content, lower, scheme, formatSchemeName(scheme));
  }
  const payPathMatch = lower.match(/https?:\/\/[^\s/]+(?:\/[^\s?]*)?\/(pay|payment|transfer|send|receive|qr-pay|payqr|collect|checkout)(?:[/?#]|$)/);
  if (payPathMatch) return parseUrlPaymentQr(content, lower);
  const payDomainMatch = lower.match(/https?:\/\/(?:pay|payments|payment)\.[a-z0-9.-]+/);
  if (payDomainMatch) return parseUrlPaymentQr(content, lower);
  const hasAmountField = /\bam(?:ount)?\s*=\s*\d/.test(lower) || /\bamt\s*=\s*\d/.test(lower) || /\bprice\s*=\s*\d/.test(lower);
  const hasPayeeField = /\bpa\s*=/.test(lower) || /\bvpa\s*=/.test(lower) || /\bpayee\s*=/.test(lower) || /\bmerchant\s*=/.test(lower) || /\bto\s*=.+@/.test(lower);
  if (hasAmountField && hasPayeeField) return parseRawFieldPaymentQr(content, lower);
  const hasPayWord = /\bpay(?:ment|ments|now|here|online|link)?\b/i.test(content);
  const hasMoneySignal = /\d+/.test(content) && (content.includes("@") || content.includes("INR") || content.includes("₹") || content.includes("amount") || content.includes("Amount"));
  if (hasPayWord && hasMoneySignal && !content.startsWith("http")) return parseRawFieldPaymentQr(content, lower);
  return null;
}

function parseSchemePaymentQrLocal(content: string, lower: string, scheme: string, displayName: string): ParsedPaymentQr {
  if (lower.includes("pa=") || lower.includes("vpa=")) return parseUnknownUpiQr(content, lower, displayName);
  let amount: string | undefined, recipientId = "", vpa: string | undefined, bankHandle: string | undefined, recipientName: string | undefined;
  try {
    const qIdx = content.indexOf("?");
    if (qIdx >= 0) {
      const params = new URLSearchParams(content.slice(qIdx + 1));
      amount = params.get("amount") || params.get("am") || params.get("amt") || undefined;
      const pn = params.get("pn") || params.get("name");
      if (pn) recipientName = decodeURIComponent(pn);
      recipientId = params.get("to") || params.get("id") || params.get("merchant") || params.get("payee") || "";
      if (recipientId.includes("@")) { vpa = recipientId; bankHandle = recipientId.split("@")[1]; }
    }
    if (!vpa) {
      const atMatch = content.match(/[\w.+-]+@[\w.]+/);
      if (atMatch) { vpa = atMatch[0]; recipientId = recipientId || atMatch[0]; bankHandle = atMatch[0].split("@")[1]; }
    }
  } catch {}
  const isIndia = !!(vpa || scheme.includes("upi") || scheme.includes("pay") || lower.includes("inr") || lower.includes("upi"));
  return {
    app: isIndia ? "upi" : "unknown_payment", appDisplayName: displayName,
    appCategory: isIndia ? "upi_india" : "other", region: isIndia ? "India" : "Regional",
    recipientId: recipientId || content.slice(0, 60), recipientName, amount,
    rawContent: content, isAmountPreFilled: !!amount && parseFloat(amount) > 0, vpa, bankHandle,
  };
}
