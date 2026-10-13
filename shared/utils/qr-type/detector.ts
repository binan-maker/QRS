import { isPaymentQr } from "@/services/analysis/payment-parser";
import type { QrContentType, QrTypeDefinition } from "./types";
import { QR_CONTENT_TYPES } from "./definitions";

export function detectContentType(content: string): QrContentType {
  const value = content?.trim();
  if (!value) return "text";
  const lower = value.toLowerCase();

  // 1. Payment QR codes (UPI, EMVCo, Crypto, SEPA, etc.)
  if (isPaymentQr(value)) return "payment";

  // 2. Direct device & communication protocols
  if (/^tel:/i.test(value) || /^\+?[\d\s\-().]{7,20}$/.test(value)) return "phone";
  if (/^mailto:/i.test(value)) return "email";
  if (/^smsto?:/i.test(value)) return "sms";
  if (/^wifi:/i.test(value)) return "wifi";
  if (/^(geo:|comgooglemaps:)/i.test(value)) return "location";
  if (/^(begin:vcard|mecard:)/i.test(value)) return "contact";
  if (/^begin:vevent/i.test(value)) return "calendar";
  if (/^otpauth:/i.test(value)) return "otp";

  // 3. Known app schemes & deep links
  if (/^(intent:|market:|whatsapp:|tg:|spotify:|twitter:|x:|instagram:|youtube:|fb:|discord:|slack:|zoommtg:|skype:)/i.test(value)) {
    return "app";
  }

  // 4. Specialized Google Services recognition
  if (/(?:maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(lower)) return "location";
  if (/(?:play\.google\.com\/store\/apps|apps\.apple\.com)/i.test(lower)) return "app";
  if (/calendar\.google\.com/i.test(lower)) return "calendar";

  // 5. General Web URLs (with or without protocol)
  try {
    const candidate = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    if (host.includes(".") && !host.endsWith(".") && !/^[\d.]+$/.test(host)) {
      return "url";
    }
    if (url.protocol.length > 2 && !["http:", "https:", "ftp:"].includes(url.protocol)) {
      return "app";
    }
  } catch {}

  return "text";
}

export function getQrTypeMeta(contentType: string): QrTypeDefinition {
  return QR_CONTENT_TYPES[contentType] ?? QR_CONTENT_TYPES.text;
}

export function resolveEffectiveType(contentType: string): QrContentType {
  const c = contentType?.toLowerCase();
  if (["payment", "upi", "paypal", "crypto", "paymentlink"].includes(c)) return "payment";
  if (["phone", "email", "sms", "wifi", "location", "contact", "calendar", "otp", "app", "url"].includes(c)) {
    return c as QrContentType;
  }
  return "text";
}
