import type { ParsedPaymentQr } from "../types";
import type { AppDef } from "./registry";
import { parseUnknownUpiQr, parseUpiContent } from "./upi-parsers";

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
  return {
    app: app.id,
    appDisplayName: app.displayName,
    appCategory: "crypto",
    region: app.region,
    recipientId: address,
    amount,
    rawContent: content,
    isAmountPreFilled: !!amount,
    coinType: app.id,
  };
}

export function parseGenericPayment(app: AppDef, content: string): ParsedPaymentQr {
  return {
    app: app.id,
    appDisplayName: app.displayName,
    appCategory: app.category,
    region: app.region,
    recipientId: content.slice(0, 60),
    rawContent: content,
    isAmountPreFilled: false,
  };
}

export function buildParsedPayment(app: AppDef, content: string, _lower: string): ParsedPaymentQr {
  try {
    if (app.category === "upi_india") return parseUpiContent(app, content);
    if (app.category === "crypto") return parseCryptoContent(app, content);
    return parseGenericPayment(app, content);
  } catch {
    return parseGenericPayment(app, content);
  }
}

export function detectUniversalPayment(content: string, lower: string): ParsedPaymentQr | null {
  if (
    lower.startsWith("upi://") ||
    (!lower.startsWith("http://") &&
      !lower.startsWith("https://") &&
      /[?&]pa=[^&\s]+@[^&\s]+/i.test(content))
  ) {
    return parseUnknownUpiQr(content, lower, "UPI Payment");
  }
  return null;
}
