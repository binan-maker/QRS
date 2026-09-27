import type { PaymentAppId, ParsedPaymentQr } from "../types";
import { BANK_HANDLE_TO_APP, type AppDef } from "./registry";

export function formatSchemeName(scheme: string): string {
  const nice = scheme.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (nice.toLowerCase().includes("upi")) return `${nice} (UPI)`;
  return nice;
}

export function parseUnknownUpiQr(content: string, lower: string, displayName: string): ParsedPaymentQr {
  let pa = "", pn = "", cu = "INR";
  let am: string | undefined, tn: string | undefined;
  try {
    const urlLike = content.includes("://") ? content : `upi://pay?${content.includes("?") ? content.split("?")[1] : content}`;
    const params = new URLSearchParams(urlLike.split("?")[1] || "");
    pa = params.get("pa") || "";
    pn = params.get("pn") || "";
    am = params.get("am") || params.get("amount") || undefined;
    tn = params.get("tn") || params.get("note") || undefined;
    cu = params.get("cu") || "INR";
  } catch {}
  if (!pa) {
    const paMatch = content.match(/pa=([^&\s]+)/i);
    if (paMatch) pa = decodeURIComponent(paMatch[1]);
  }
  const bankHandle = pa.includes("@") ? pa.split("@")[1].toLowerCase() : "";
  const schemeRaw = content.split("://")[0]?.toLowerCase() || "upi";
  const detectedFromScheme = schemeRaw !== "upi" && schemeRaw !== "http" && schemeRaw !== "https"
    ? BANK_HANDLE_TO_APP[schemeRaw] : undefined;
  const detectedFromHandle = bankHandle ? BANK_HANDLE_TO_APP[bankHandle] : undefined;
  const detected = detectedFromHandle || detectedFromScheme;
  const appId: PaymentAppId = detected?.id ?? "upi";
  const appName = detected?.name ?? (schemeRaw === "upi" ? displayName : formatSchemeName(schemeRaw));
  return {
    app: appId, appDisplayName: appName, appCategory: "upi_india", region: "India",
    recipientId: pa, recipientName: pn ? decodeURIComponent(pn) : undefined,
    amount: am, currency: cu, note: tn ? decodeURIComponent(tn) : undefined,
    rawContent: content, isAmountPreFilled: !!am && parseFloat(am) > 0, bankHandle, vpa: pa,
  };
}

export function parseSchemePaymentQr(content: string, lower: string, scheme: string, displayName: string): ParsedPaymentQr {
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

export function parseUpiContent(app: AppDef, content: string): ParsedPaymentQr {
  let url: URL;
  try { url = new URL(content); } catch {
    return {
      app: app.id, appDisplayName: app.displayName, appCategory: app.category, region: app.region,
      recipientId: content.slice(0, 60), rawContent: content, isAmountPreFilled: false,
    };
  }
  const params = url.searchParams;
  const pa = params.get("pa") || "", pn = params.get("pn") || "";
  const am = params.get("am") || undefined, tn = params.get("tn") || undefined, cu = params.get("cu") || "INR";
  const bankHandle = pa.split("@")[1] || "";
  return {
    app: app.id, appDisplayName: app.displayName, appCategory: app.category, region: app.region,
    recipientId: pa, recipientName: pn ? decodeURIComponent(pn) : undefined,
    amount: am, currency: cu, note: tn ? decodeURIComponent(tn) : undefined,
    rawContent: content, isAmountPreFilled: !!am && parseFloat(am) > 0, bankHandle, vpa: pa,
  };
}
