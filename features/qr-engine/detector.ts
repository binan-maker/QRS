/**
 * QR ENGINE — CANONICAL CONTENT-TYPE DETECTOR
 *
 * QR content is deliberately reduced to two types:
 *   - url: HTTP(S) website links
 *   - text: everything else, including payment and social payloads
 *
 * This prevents protocol-specific categories such as UPI, WhatsApp,
 * Instagram, Facebook, email, phone, and Wi-Fi from surfacing anywhere in
 * the product.
 */

export function detectContentType(content: string): "url" | "text" {
  if (!content?.trim()) return "text";

  try {
    const url = new URL(content.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? "url" : "text";
  } catch {
    // QR scanners often return bare domains. Treat those as website links.
    if (/^(?:www\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)+(?::\d+)?(?:[/?#].*)?$/i.test(content.trim())) {
      return "url";
    }
    return "text";
  }
}