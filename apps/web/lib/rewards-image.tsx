"use client";

import React, { useState, useEffect } from "react";

export const KNOWN_MERCHANT_DOMAINS: Record<string, string> = {
  "tata cliq": "tatacliq.com",
  "tatacliq": "tatacliq.com",
  "boat lifestyle": "boat-lifestyle.com",
  "boat": "boat-lifestyle.com",
  "tenxyou": "tenxyou.com",
  "blabliblulife": "blabliblulife.com",
  "blabliblu": "blabliblulife.com",
  "ajio": "ajio.com",
  "flipkart": "flipkart.com",
  "myntra": "myntra.com",
  "swiggy": "swiggy.com",
  "zomato": "zomato.com",
  "makemytrip": "makemytrip.com",
  "mmt": "makemytrip.com",
  "nykaa": "nykaa.com",
  "croma": "croma.com",
  "amazon": "amazon.in",
  "binro official": "binro.in",
  "binro": "binro.in",
  "hostinger": "hostinger.in",
  "mamaearth": "mamaearth.in",
  "puma": "puma.com",
  "adidas": "adidas.co.in",
  "nike": "nike.com",
  "lenskart": "lenskart.com",
  "pharmeasy": "pharmeasy.in",
  "netmeds": "netmeds.com",
  "1mg": "1mg.com",
  "dominos": "dominos.co.in",
  "kfc": "kfc.co.in",
  "mcaffeine": "mcaffeine.com",
  "beardo": "beardo.in",
  "wow skin science": "buywow.in",
  "wow": "buywow.in",
};

/**
 * Robustly normalizes an image URL extracted from vCommission feeds,
 * HasOffers creative files, HTML snippets, or raw dashboard copy-paste.
 */
export function extractAndNormalizeImageUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  let clean = raw.trim();
  if (!clean || clean.length < 4) return null;

  // 1. Decode HTML entities if pasted from HTML source
  clean = clean
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  // 2. Extract src from HTML <img> tag (supports single, double, or unquoted src)
  const imgMatch = clean.match(/<img[^>]+src=["']?([^"'>\s]+)["']?/i);
  if (imgMatch && imgMatch[1]) {
    clean = imgMatch[1].trim();
  } else {
    // 3. Extract href from anchor if it points to an image file or creative CDN
    const aMatch = clean.match(/href=["']?([^"'>\s]+)["']?/i);
    if (
      aMatch &&
      aMatch[1] &&
      (/\.(png|jpe?g|webp|gif|svg|ico)(\?.*)?$/i.test(aMatch[1]) ||
        aMatch[1].includes("media.hasoffers.com") ||
        aMatch[1].includes("vcommission.com/media"))
    ) {
      clean = aMatch[1].trim();
    } else {
      // 4. Search for any standalone HTTP/HTTPS URL pointing to an image or creative file
      const directUrlMatch = clean.match(
        /https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|webp|gif|svg|ico)(?:\?[^\s"'<>]*)?/i
      );
      if (directUrlMatch && directUrlMatch[0]) {
        clean = directUrlMatch[0].trim();
      } else {
        // 5. Search for HasOffers or vCommission creative CDN URL pattern
        const affiliateCdnMatch = clean.match(
          /https?:\/\/(?:[a-zA-Z0-9-]+\.)?(?:hasoffers\.com|vcommission\.com)\/[^\s"'<>]+/i
        );
        if (affiliateCdnMatch && affiliateCdnMatch[0]) {
          clean = affiliateCdnMatch[0].trim();
        }
      }
    }
  }

  // 6. Strip wrapping quotes, parentheses, brackets, or angle brackets
  clean = clean.replace(/^['"(\[<]+|['")\]>]+$/g, "").trim();

  // 7. Convert protocol-relative // to https://
  if (clean.startsWith("//")) {
    clean = `https:${clean}`;
  }

  // 8. Return if valid local asset
  if (clean.startsWith("/")) {
    return clean;
  }

  // 9. If valid HTTP or HTTPS URL
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }

  // 10. If raw domain pattern without protocol (e.g. media.hasoffers.com/brand.jpg)
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/.*\.(png|jpe?g|webp|gif|svg|ico)/i.test(clean)) {
    return `https://${clean}`;
  }

  return null;
}

export function getMerchantDomain(merchantName: string): string {
  const clean = (merchantName || "").toLowerCase().trim();
  for (const [key, domain] of Object.entries(KNOWN_MERCHANT_DOMAINS)) {
    if (clean.includes(key)) {
      return domain;
    }
  }
  const stripped = clean
    .replace(/\.com|\.in|\.org/gi, "")
    .replace(/lifestyle|fashion|india|store|official|online|cps|cpa/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  return stripped ? `${stripped}.com` : "binro.in";
}

/**
 * Builds an array of fallback logo and creative URLs for a merchant,
 * trying direct vCommission URL first, server image proxy, followed by
 * Google Favicon CDN (128px), DuckDuckGo, Clearbit, and Unavatar.
 */
export function getMerchantLogoCandidates(
  merchantName: string,
  directUrl?: string | null
): string[] {
  const candidates: string[] = [];

  // Special case for BinRo demo / local brand
  if (
    merchantName.toLowerCase().includes("binro") ||
    directUrl === "/icon0.svg" ||
    directUrl === "/apple-icon.png"
  ) {
    return ["/icon0.svg", "/apple-icon.png", "/favicon.svg"];
  }

  // 1. Direct vCommission creative / thumbnail if provided
  const normalizedDirect = extractAndNormalizeImageUrl(directUrl);
  if (normalizedDirect) {
    // If it's a remote URL, add both direct and server proxy versions
    if (normalizedDirect.startsWith("http://") || normalizedDirect.startsWith("https://")) {
      candidates.push(normalizedDirect);
      candidates.push(`/api/rewards/image-proxy?url=${encodeURIComponent(normalizedDirect)}`);
    } else {
      candidates.push(normalizedDirect);
    }
  }

  const domain = getMerchantDomain(merchantName);

  // 2. High-res Google Favicon CDN (128px) - exceptionally reliable and fast
  candidates.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);

  // 3. DuckDuckGo Icon CDN
  candidates.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);

  // 4. Clearbit Logo CDN
  candidates.push(`https://logo.clearbit.com/${domain}`);

  // 5. Logo.dev free endpoint
  candidates.push(`https://img.logo.dev/${domain}?token=pk_anonymous`);

  // 6. Unavatar CDN
  candidates.push(`https://unavatar.io/${domain}`);

  // 7. Proxy fallback for Google Favicon
  candidates.push(
    `/api/rewards/image-proxy?url=${encodeURIComponent(
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    )}`
  );

  return Array.from(new Set(candidates));
}

interface MerchantLogoProps {
  merchantName: string;
  directUrl?: string | null;
  className?: string;
  alt?: string;
  fallbackInitialClassName?: string;
}

export function MerchantLogo({
  merchantName,
  directUrl,
  className,
  alt,
  fallbackInitialClassName,
}: MerchantLogoProps) {
  const candidates = getMerchantLogoCandidates(merchantName, directUrl);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  // Reset state whenever merchant or directUrl changes to allow proper reprocessing
  useEffect(() => {
    setCandidateIndex(0);
    setHasFailedAll(false);
  }, [merchantName, directUrl]);

  const currentSrc = candidates[candidateIndex];

  if (hasFailedAll || !currentSrc) {
    return (
      <span className={fallbackInitialClassName || ""}>
        {(merchantName || "B").charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt || merchantName || "Merchant Logo"}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (candidateIndex + 1 < candidates.length) {
          setCandidateIndex((prev) => prev + 1);
        } else {
          setHasFailedAll(true);
        }
      }}
    />
  );
}

interface MerchantBannerProps {
  merchantName: string;
  directUrl?: string | null;
  category?: string;
  className?: string;
  alt?: string;
}

export function MerchantBanner({
  merchantName,
  directUrl,
  category,
  className,
  alt,
}: MerchantBannerProps) {
  const candidates = getMerchantLogoCandidates(merchantName, directUrl);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setHasFailedAll(false);
  }, [merchantName, directUrl]);

  const currentSrc = candidates[candidateIndex];

  if (hasFailedAll || !currentSrc) {
    return null;
  }

  return (
    <img
      src={currentSrc}
      alt={alt || `${merchantName} Creative Banner`}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (candidateIndex + 1 < candidates.length) {
          setCandidateIndex((prev) => prev + 1);
        } else {
          setHasFailedAll(true);
        }
      }}
    />
  );
}
