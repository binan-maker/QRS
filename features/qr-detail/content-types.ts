export type QrDetailContentType = "payment" | "url" | "text";

const PAYMENT_CONTENT_TYPES = new Set([
  "payment",
  "upi",
  "paymentlink",
  "scantopay",
  "bharatqr",
]);

export function normalizeQrDetailContentType(contentType?: string | null): QrDetailContentType {
  if (contentType && PAYMENT_CONTENT_TYPES.has(contentType.toLowerCase())) return "payment";
  if (contentType?.toLowerCase() === "url") return "url";
  return "text";
}