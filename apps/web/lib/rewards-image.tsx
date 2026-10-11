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
 * HasOffers creative files, or raw dashboard copy-paste.
 */
export function extractAndNormalizeImageUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  let clean = raw.trim();
  if (!clean || clean.length < 5) return null;

  // Extract src from HTML <img> tag if present (e.g. <img src="..." />)
  const imgMatch = clean.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    clean = imgMatch[1].trim();
  }

  // Extract url from markdown or raw anchor if present
  const aMatch = clean.match(/href=["']([^"']+)["']/i);
  if (!imgMatch && aMatch && aMatch[1] && /\.(png|jpe?g|webp|gif|svg)/i.test(aMatch[1])) {
    clean = aMatch[1].trim();
  }

  // Strip wrapping quotes
  clean = clean.replace(/^['"]|['"]$/g, "");

  // Convert protocol-relative // to https://
  if (clean.startsWith("//")) {
    clean = `https:${clean}`;
  }

  // Upgrade insecure http:// to https:// to prevent Mixed Content blocking
  if (clean.startsWith("http://")) {
    clean = `https://${clean.slice(7)}`;
  }

  // Ensure it's a valid web URL or local asset
  if (clean.startsWith("https://") || clean.startsWith("/")) {
    return clean;
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
 * Builds an array of fallback logo URLs for a merchant, trying direct vCommission URL first,
 * then server image proxy, followed by Google Favicon CDN (128px), Clearbit, DuckDuckGo,
 * Logo.dev, and Unavatar.
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
    candidates.push(normalizedDirect);
    // Add server proxy fallback in case the direct URL has strict CORS or hotlink prevention
    if (normalizedDirect.startsWith("https://")) {
      candidates.push(`/api/rewards/image-proxy?url=${encodeURIComponent(normalizedDirect)}`);
    }
  }

  const domain = getMerchantDomain(merchantName);

  // 2. High-res Google Favicon CDN (128px) - reliable and fast
  candidates.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);

  // 3. Clearbit Logo CDN
  candidates.push(`https://logo.clearbit.com/${domain}`);

  // 4. DuckDuckGo Icon CDN
  candidates.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);

  // 5. Logo.dev free public endpoint
  candidates.push(`https://img.logo.dev/${domain}?token=pk_anonymous`);

  // 6. Unavatar CDN
  candidates.push(`https://unavatar.io/${domain}`);

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
      crossOrigin="anonymous"
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
      crossOrigin="anonymous"
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
