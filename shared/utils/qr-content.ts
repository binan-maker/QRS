import { isPaymentQr, parseAnyPaymentQr } from "@/services/analysis/payment-parser";

export type QrContentType = "url" | "payment" | "text" | "phone" | "email" | "sms" | "wifi";

export interface QrTypeDefinition {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  gradient: readonly [string, string];
  category: "web" | "text" | "payment";
  openLabel: string;
  appScheme?: string;
  webFallback?: boolean;
  getDisplayLabel: (content: string) => string;
  getSubtitle: (content: string) => string | null;
}

const truncate = (value: string, length = 40) =>
  value.length > length ? `${value.slice(0, length)}…` : value;

function getHost(content: string) {
  try {
    const url = new URL(content.startsWith("http") ? content : `https://${content}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return truncate(content, 36);
  }
}

export const QR_CONTENT_TYPES: Record<string, QrTypeDefinition> = {
  payment: {
    key: "payment",
    label: "Payment",
    icon: "card-outline",
    color: "#059669",
    bg: "#ECFDF5",
    gradient: ["#047857", "#10B981"],
    category: "payment",
    openLabel: "Open",
    getDisplayLabel: (content) => {
      const parsed = parseAnyPaymentQr(content);
      if (parsed) {
        if (parsed.recipientName) return parsed.recipientName;
        if (parsed.vpa) return parsed.vpa;
        if (parsed.recipientId) return truncate(parsed.recipientId, 32);
      }
      return "Payment QR";
    },
    getSubtitle: (content) => {
      const parsed = parseAnyPaymentQr(content);
      if (parsed?.amount) {
        const curr = parsed.currency === "INR" || parsed.appCategory === "upi_india" ? "₹" : parsed.currency ? `${parsed.currency} ` : "";
        return `${ parsed.vpa ? `${parsed.vpa} • ` : "" }${curr}${parsed.amount}`;
      }
      return parsed?.vpa || parsed?.recipientId || truncate(content, 44);
    },
  },
  text: {
    key: "text",
    label: "Text",
    icon: "document-text-outline",
    color: "#6B7280",
    bg: "#F9FAFB",
    gradient: ["#475569", "#64748B"],
    category: "text",
    openLabel: "Copy Text",
    getDisplayLabel: (content) => truncate(content),
    getSubtitle: () => null,
  },
  url: {
    key: "url",
    label: "Website",
    icon: "globe-outline",
    color: "#1D4ED8",
    bg: "#EFF6FF",
    gradient: ["#1E3A8A", "#1D4ED8"],
    category: "web",
    openLabel: "Open Website",
    getDisplayLabel: getHost,
    getSubtitle: (content) => truncate(content, 44),
  },
};

export function detectContentType(content: string): QrContentType {
  const value = content?.trim();
  if (!value) return "text";

  // 1. Payment QR codes (UPI, Google Pay, PayPal, PhonePe, Paytm, Venmo, Cash App, Crypto, EMVCo, etc.)
  if (isPaymentQr(value)) {
    return "payment";
  }

  // 2. Direct communication schemes
  if (/^tel:/i.test(value) || /^\+?[\d\s\-().]{7,20}$/.test(value)) return "phone";
  if (/^mailto:/i.test(value)) return "email";
  if (/^smsto?:/i.test(value)) return "sms";
  if (/^wifi:/i.test(value)) return "wifi";

  // 3. URLs
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? "url" : "text";
  } catch {
    return /^(?:www\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)+(?::\d+)?(?:[/?#].*)?$/i.test(value)
      ? "url"
      : "text";
  }
}

export function getQrTypeMeta(contentType: string, _templateKey?: string): QrTypeDefinition {
  return QR_CONTENT_TYPES[contentType] ?? QR_CONTENT_TYPES.text;
}

export function getDisplayLabel(content: string, contentType?: string) {
  const type = getQrTypeMeta(contentType || detectContentType(content));
  return type.getDisplayLabel(content) || truncate(content);
}

export function getSubtitle(content: string, contentType?: string) {
  return getQrTypeMeta(contentType || detectContentType(content)).getSubtitle(content);
}

export function resolveEffectiveType(contentType: string, templateKey?: string) {
  const candidate = (templateKey || contentType)?.toLowerCase();
  if (
    candidate === "payment" ||
    candidate === "upi" ||
    candidate === "paypal" ||
    candidate === "crypto" ||
    candidate === "paymentlink"
  ) {
    return "payment";
  }
  if (candidate === "url") return "url";
  if (candidate === "phone" || candidate === "email" || candidate === "sms" || candidate === "wifi") {
    return candidate;
  }
  return "text";
}

export function useQrMeta(content: string, contentType: string, templateKey?: string) {
  const effectiveType = resolveEffectiveType(contentType, templateKey);
  const typeMeta = getQrTypeMeta(effectiveType);
  return {
    typeMeta,
    displayLabel: getDisplayLabel(content, effectiveType),
    subtitle: getSubtitle(content, effectiveType),
  };
}