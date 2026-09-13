export type QrDetailContentType = "url" | "text";

export function normalizeQrDetailContentType(contentType?: string | null): QrDetailContentType {
  if (contentType?.toLowerCase() === "url") return "url";
  return "text";
}