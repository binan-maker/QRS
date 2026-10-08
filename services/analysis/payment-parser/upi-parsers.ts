import type { ParsedPaymentQr } from "../types";
import type { AppDef } from "./registry";

export function parseUnknownUpiQr(content: string, _lower: string, displayName: string): ParsedPaymentQr {
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
  return {
    app: "upi",
    appDisplayName: displayName || "UPI Payment",
    appCategory: "upi_india",
    region: "India",
    recipientId: pa,
    recipientName: pn ? decodeURIComponent(pn) : undefined,
    amount: am,
    currency: cu,
    note: tn ? decodeURIComponent(tn) : undefined,
    rawContent: content,
    isAmountPreFilled: !!am && parseFloat(am) > 0,
    bankHandle,
    vpa: pa,
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
