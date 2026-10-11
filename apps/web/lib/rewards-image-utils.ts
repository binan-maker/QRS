/**
 * Server-safe reward image normalization and logo utilities.
 * Completely free of "use client" directives or React hooks.
 */

export const VCOMMISSION_NETWORK_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" rx="24" fill="#0F172A"/>
  <path d="M32 38 L60 84 L88 38" stroke="#38BDF8" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="60" cy="56" r="6" fill="#F59E0B"/>
</svg>
`);

export function extractAndNormalizeImageUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  let clean = raw.trim();
  if (!clean || clean.length < 4) return null;

  clean = clean
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  const imgMatch = clean.match(/<img[^>]+src=["']?([^"'>\s]+)["']?/i);
  if (imgMatch && imgMatch[1]) {
    clean = imgMatch[1].trim();
  } else {
    const aMatch = clean.match(/href=["']?([^"'>\s]+)["']?/i);
    if (
      aMatch &&
      aMatch[1] &&
      (/\.(png|jpe?g|webp|gif|svg|ico)(\?.*)?$/i.test(aMatch[1]) ||
        aMatch[1].includes("media.hasoffers.com") ||
        aMatch[1].includes("vcommission.com/media") ||
        aMatch[1].includes("tracking.vcommission.com"))
    ) {
      clean = aMatch[1].trim();
    } else {
      const directUrlMatch = clean.match(
        /https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|webp|gif|svg|ico)(?:\?[^\s"'<>]*)?/i
      );
      if (directUrlMatch && directUrlMatch[0]) {
        clean = directUrlMatch[0].trim();
      } else {
        const affiliateCdnMatch = clean.match(
          /https?:\/\/(?:[a-zA-Z0-9-]+\.)?(?:hasoffers\.com|vcommission\.com)\/[^\s"'<>]+/i
        );
        if (affiliateCdnMatch && affiliateCdnMatch[0]) {
          clean = affiliateCdnMatch[0].trim();
        }
      }
    }
  }

  clean = clean.replace(/^['"(\[<]+|['")\]>]+$/g, "").trim();

  if (clean.startsWith("//")) {
    clean = `https:${clean}`;
  }
  if (clean.startsWith("/")) {
    return clean;
  }
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/.*\.(png|jpe?g|webp|gif|svg|ico)/i.test(clean)) {
    return `https://${clean}`;
  }

  return null;
}

export function getMerchantDomain(merchantName: string): string {
  const clean = (merchantName || "").toLowerCase().trim();
  const stripped = clean
    .replace(/\.com|\.in|\.org/gi, "")
    .replace(/lifestyle|fashion|india|store|official|online|cps|cpa|cpl/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  return stripped ? `${stripped}.com` : "vcommission.com";
}
