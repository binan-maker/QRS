"use client";

import React, { useState, useEffect } from "react";

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
        aMatch[1].includes("vcommission.com/media") ||
        aMatch[1].includes("tracking.vcommission.com"))
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

  // 10. If raw domain pattern without protocol
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/.*\.(png|jpe?g|webp|gif|svg|ico)/i.test(clean)) {
    return `https://${clean}`;
  }

  return null;
}

/**
 * Cleans a merchant name string into a sanitized brand identifier without hardcoded mappings.
 */
export function getMerchantDomain(merchantName: string): string {
  const clean = (merchantName || "").toLowerCase().trim();
  const stripped = clean
    .replace(/\.com|\.in|\.org/gi, "")
    .replace(/lifestyle|fashion|india|store|official|online|cps|cpa|cpl/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  return stripped ? `${stripped}.com` : "vcommission.com";
}

// ── Official vCommission Network Inline Creative Assets (SVG Data URIs) ───────
export const VCOMMISSION_NETWORK_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="vcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0052CC"/>
      <stop offset="50%" stop-color="#003A99"/>
      <stop offset="100%" stop-color="#0A1E45"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="26" fill="url(#vcGrad)"/>
  <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
  <path d="M38 42 L52 78 L68 78 L82 42 L70 42 L60 68 L50 42 Z" fill="url(#goldGrad)"/>
  <circle cx="60" cy="34" r="5" fill="#FFFFFF"/>
</svg>`);

export const VCOMMISSION_NETWORK_BANNER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" width="600" height="240">
  <defs>
    <linearGradient id="bannerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#071938"/>
      <stop offset="45%" stop-color="#003A99"/>
      <stop offset="85%" stop-color="#0052CC"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <rect width="600" height="240" fill="url(#bannerGrad)"/>
  <g opacity="0.08">
    <circle cx="100" cy="60" r="140" fill="none" stroke="#FFFFFF" stroke-width="2"/>
    <circle cx="500" cy="180" r="160" fill="none" stroke="#FFFFFF" stroke-width="2"/>
    <path d="M0 120 Q 300 0 600 120" fill="none" stroke="#FFFFFF" stroke-width="2"/>
  </g>
  <g transform="translate(48, 80)">
    <rect width="52" height="52" rx="14" fill="#FFFFFF" opacity="0.95"/>
    <path d="M14 14 L22 38 L30 38 L38 14 L32 14 L26 31 L20 14 Z" fill="#0052CC"/>
    <circle cx="26" cy="10" r="3" fill="#D97706"/>
  </g>
  <text x="116" y="105" fill="#FFFFFF" font-family="Inter, -apple-system, sans-serif" font-size="22" font-weight="800" letter-spacing="0.5">vCommission Verified Offer</text>
  <text x="116" y="128" fill="rgba(255,255,255,0.78)" font-family="Inter, -apple-system, sans-serif" font-size="13" font-weight="600">Official Affiliate Network Coupon &bull; Exclusive Voucher</text>
</svg>`);

/**
 * Builds candidate image URLs strictly from vCommission and HasOffers media assets.
 * No hardcoded company logo scrapers or third-party favicon endpoints.
 */
export function getMerchantLogoCandidates(
  merchantName: string,
  directUrl?: string | null,
  campaignId?: string | null
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

  // 1. Direct vCommission creative URL from offer payload if available
  const normalizedDirect = extractAndNormalizeImageUrl(directUrl);
  if (normalizedDirect) {
    if (normalizedDirect.startsWith("http://") || normalizedDirect.startsWith("https://")) {
      candidates.push(normalizedDirect);
      candidates.push(`/api/rewards/image-proxy?url=${encodeURIComponent(normalizedDirect)}`);
    } else {
      candidates.push(normalizedDirect);
    }
  }

  // 2. vCommission HasOffers / TUNE campaign creative assets based on campaignId
  const cleanCampaignId = (campaignId || "").trim();
  if (cleanCampaignId && cleanCampaignId !== "auto" && cleanCampaignId !== "feed") {
    const hasOffersBrandLogo = `https://media.hasoffers.com/brand/${cleanCampaignId}/logo.png`;
    candidates.push(hasOffersBrandLogo);
    candidates.push(`/api/rewards/image-proxy?url=${encodeURIComponent(hasOffersBrandLogo)}`);

    const hasOffersCreative = `https://media.hasoffers.com/network_images/vcommission/${cleanCampaignId}_creative.png`;
    candidates.push(hasOffersCreative);
    candidates.push(`/api/rewards/image-proxy?url=${encodeURIComponent(hasOffersCreative)}`);

    const trackingCreative = `https://tracking.vcommission.com/media/offer_${cleanCampaignId}.png`;
    candidates.push(trackingCreative);
    candidates.push(`/api/rewards/image-proxy?url=${encodeURIComponent(trackingCreative)}`);
  }

  // 3. Fallback: Official vCommission Network verified crest SVG
  candidates.push(VCOMMISSION_NETWORK_LOGO);

  return Array.from(new Set(candidates));
}

/**
 * Builds candidate banner creative URLs strictly from vCommission / HasOffers.
 * Rejects logos so that small icons are never zoomed in or stretched across wide banners.
 */
export function getMerchantBannerCandidates(
  merchantName: string,
  bannerUrl?: string | null,
  campaignId?: string | null,
  creativeUrls?: (string | null | undefined)[] | null,
  directUrl?: string | null
): string[] {
  const candidates: string[] = [];

  const isLogoLike = (url: string) => {
    const lower = url.toLowerCase();
    if (
      lower.includes("banner") ||
      lower.includes("creative") ||
      lower.includes("offer_") ||
      lower.includes("hasoffers.com/brand/")
    ) {
      if (lower.includes("logo.png") || lower.includes("/logo") || lower.endsWith("logo.svg")) {
        return true;
      }
      return false;
    }
    return (
      lower.includes("logo.png") ||
      lower.includes("/logo") ||
      lower.endsWith("logo.svg") ||
      lower.includes("icon0.svg") ||
      lower.includes("apple-icon")
    );
  };

  // 1. Process explicit creativeUrls array (these are the slide creatives)
  if (Array.isArray(creativeUrls)) {
    for (const raw of creativeUrls) {
      if (!raw) continue;
      const normalized = extractAndNormalizeImageUrl(raw);
      if (normalized && !isLogoLike(normalized)) {
        candidates.push(normalized);
        if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
          candidates.push(`/api/rewards/image-proxy?url=${encodeURIComponent(normalized)}`);
        }
      }
    }
  }

  // 2. Process explicit bannerUrl
  if (bannerUrl) {
    const normalized = extractAndNormalizeImageUrl(bannerUrl);
    if (normalized && !isLogoLike(normalized)) {
      candidates.push(normalized);
      if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
        candidates.push(`/api/rewards/image-proxy?url=${encodeURIComponent(normalized)}`);
      }
    }
  }

  // 3. Process directUrl if provided and not a logo
  if (directUrl) {
    const normalized = extractAndNormalizeImageUrl(directUrl);
    if (normalized && !isLogoLike(normalized)) {
      candidates.push(normalized);
      if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
        candidates.push(`/api/rewards/image-proxy?url=${encodeURIComponent(normalized)}`);
      }
    }
  }

  // 4. vCommission HasOffers / TUNE Campaign Banners from campaignId
  const cleanCampaignId = (campaignId || "").trim();
  if (cleanCampaignId && cleanCampaignId !== "auto" && cleanCampaignId !== "feed") {
    const bannerUrl1 = `https://media.hasoffers.com/brand/${cleanCampaignId}/banner.jpg`;
    candidates.push(bannerUrl1);
    candidates.push(`/api/rewards/image-proxy?url=${encodeURIComponent(bannerUrl1)}`);

    const netBanner = `https://media.hasoffers.com/network_images/vcommission/${cleanCampaignId}_banner.jpg`;
    candidates.push(netBanner);
    candidates.push(`/api/rewards/image-proxy?url=${encodeURIComponent(netBanner)}`);

    const trackCreative = `https://tracking.vcommission.com/media/offer_${cleanCampaignId}.png`;
    candidates.push(trackCreative);
    candidates.push(`/api/rewards/image-proxy?url=${encodeURIComponent(trackCreative)}`);
  }

  // 5. Fallback to high-res vCommission official network banner
  candidates.push(VCOMMISSION_NETWORK_BANNER);

  return Array.from(new Set(candidates));
}

interface MerchantLogoProps {
  merchantName: string;
  directUrl?: string | null;
  campaignId?: string | null;
  className?: string;
  alt?: string;
  fallbackInitialClassName?: string;
}

export function MerchantLogo({
  merchantName,
  directUrl,
  campaignId,
  className,
  alt,
  fallbackInitialClassName,
}: MerchantLogoProps) {
  const candidates = getMerchantLogoCandidates(merchantName, directUrl, campaignId);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setHasFailedAll(false);
  }, [merchantName, directUrl, campaignId]);

  const currentSrc = candidates[candidateIndex];

  if (hasFailedAll || !currentSrc) {
    return (
      <span className={fallbackInitialClassName || ""}>
        {(merchantName || "V").charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt || `${merchantName} Logo via vCommission`}
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

export interface MerchantSlideBannerProps {
  merchantName: string;
  bannerUrl?: string | null;
  creativeUrls?: (string | null | undefined)[] | null;
  campaignId?: string | null;
  category?: string;
  directUrl?: string | null;
  className?: string;
  alt?: string;
  showControls?: boolean;
  showIndicators?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

/**
 * Slide Banner with width and size that fit inside the box without stretching,
 * zooming in, or cropping. Supports multiple creative images from vCommission,
 * navigation arrows, pagination dots, touch swipes, and auto-rotation.
 */
export function MerchantSlideBanner({
  merchantName,
  bannerUrl,
  creativeUrls,
  campaignId,
  directUrl,
  className,
  alt,
  showControls = true,
  showIndicators = true,
  autoPlay = true,
  autoPlayInterval = 4500,
}: MerchantSlideBannerProps) {
  // Collect candidate creative slides
  const candidateSlides = React.useMemo(() => {
    const list: string[] = [];
    const isLogoLike = (url: string) => {
      const lower = url.toLowerCase();
      if (lower.includes("banner") || lower.includes("creative") || lower.includes("offer_")) {
        return lower.includes("logo.png") || lower.includes("/logo");
      }
      return (
        lower.includes("logo.png") ||
        lower.includes("/logo") ||
        lower.endsWith("logo.svg") ||
        lower.includes("icon0.svg") ||
        lower.includes("apple-icon")
      );
    };

    if (Array.isArray(creativeUrls)) {
      for (const raw of creativeUrls) {
        if (!raw) continue;
        const normalized = extractAndNormalizeImageUrl(raw);
        if (normalized && !isLogoLike(normalized)) {
          list.push(normalized);
        }
      }
    }

    if (bannerUrl) {
      const normalized = extractAndNormalizeImageUrl(bannerUrl);
      if (normalized && !isLogoLike(normalized)) {
        list.push(normalized);
      }
    }

    if (directUrl) {
      const normalized = extractAndNormalizeImageUrl(directUrl);
      if (normalized && !isLogoLike(normalized)) {
        list.push(normalized);
      }
    }

    const cleanCampaignId = (campaignId || "").trim();
    if (cleanCampaignId && cleanCampaignId !== "auto" && cleanCampaignId !== "feed") {
      list.push(`https://media.hasoffers.com/brand/${cleanCampaignId}/banner.jpg`);
      list.push(`https://media.hasoffers.com/network_images/vcommission/${cleanCampaignId}_banner.jpg`);
      list.push(`https://tracking.vcommission.com/media/offer_${cleanCampaignId}.png`);
    }

    list.push(VCOMMISSION_NETWORK_BANNER);

    return Array.from(new Set(list));
  }, [bannerUrl, creativeUrls, campaignId, directUrl]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [failedSlides, setFailedSlides] = useState<Set<number>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = React.useRef<number | null>(null);

  // Active working slides (filter out failed ones)
  const activeSlides = React.useMemo(() => {
    const valid = candidateSlides.filter((_, idx) => !failedSlides.has(idx));
    return valid.length > 0 ? valid : [VCOMMISSION_NETWORK_BANNER];
  }, [candidateSlides, failedSlides]);

  const totalSlides = activeSlides.length;
  const safeSlideIndex = currentSlide % totalSlides;
  const activeSrc = activeSlides[safeSlideIndex];

  // Auto-play timer
  useEffect(() => {
    if (!autoPlay || totalSlides <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [autoPlay, totalSlides, isPaused, autoPlayInterval]);

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleImageError = () => {
    setFailedSlides((prev) => new Set(prev).add(candidateSlides.indexOf(activeSrc)));
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "150px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #070e1c 0%, #0d1b2a 100%)",
        borderRadius: "inherit",
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
        setIsPaused(true);
      }}
      onTouchEnd={(e) => {
        setIsPaused(false);
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (diff > 35) {
          handleNext();
        } else if (diff < -35) {
          handlePrev();
        }
        touchStartX.current = null;
      }}
    >
      {/* Subtle Ambient Backdrop (ensures the container looks rich without zooming) */}
      <img
        src={activeSrc}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        style={{
          position: "absolute",
          inset: "-14px",
          width: "calc(100% + 28px)",
          height: "calc(100% + 28px)",
          objectFit: "cover",
          filter: "blur(22px) brightness(0.3) saturate(1.2)",
          opacity: 0.5,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Main Slide Banner Image: FIT IN THAT BOX with width and size cleanly */}
      <img
        src={activeSrc}
        alt={alt || `${merchantName} Banner Slide ${safeSlideIndex + 1}`}
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={handleImageError}
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          display: "block",
          margin: "0 auto",
          filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))",
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Navigation Left Arrow Button */}
      {showControls && totalSlides > 1 && (
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous banner slide"
          style={{
            position: "absolute",
            left: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 6,
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(10, 16, 30, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            backdropFilter: "blur(6px)",
            padding: 0,
            transition: "all 0.15s ease",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Navigation Right Arrow Button */}
      {showControls && totalSlides > 1 && (
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next banner slide"
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 6,
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(10, 16, 30, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            backdropFilter: "blur(6px)",
            padding: 0,
            transition: "all 0.15s ease",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Slide Pagination Indicator Dots */}
      {showIndicators && totalSlides > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 6,
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: "rgba(10, 16, 30, 0.65)",
            padding: "3px 8px",
            borderRadius: "100px",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          {activeSlides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSlide(idx);
              }}
              style={{
                width: idx === safeSlideIndex ? "16px" : "6px",
                height: "6px",
                borderRadius: "100px",
                background: idx === safeSlideIndex ? "#3B82F6" : "rgba(255, 255, 255, 0.35)",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Network Tag on Top Right */}
      <span
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          zIndex: 6,
          background: "rgba(10, 16, 30, 0.72)",
          color: "#FBBF24",
          fontSize: "9px",
          fontWeight: 800,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          padding: "2px 7px",
          borderRadius: "6px",
          backdropFilter: "blur(4px)",
          border: "1px solid rgba(251, 191, 36, 0.25)",
          pointerEvents: "none",
        }}
      >
        vCommission
      </span>

      {/* Counter Tag on Top Left (if multiple slides) */}
      {totalSlides > 1 && (
        <span
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            zIndex: 6,
            background: "rgba(10, 16, 30, 0.72)",
            color: "#FFFFFF",
            fontSize: "9.5px",
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: "6px",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            pointerEvents: "none",
          }}
        >
          {safeSlideIndex + 1} / {totalSlides}
        </span>
      )}
    </div>
  );
}

export interface MerchantBannerProps {
  merchantName: string;
  bannerUrl?: string | null;
  creativeUrls?: (string | null | undefined)[] | null;
  directUrl?: string | null;
  campaignId?: string | null;
  category?: string;
  className?: string;
  alt?: string;
  fit?: "contain" | "cover";
}

/**
 * Enhanced MerchantBanner that displays banners fitting the box dimensions
 * without zooming in, stretching, or showing small logos as backgrounds.
 */
export function MerchantBanner({
  merchantName,
  bannerUrl,
  creativeUrls,
  directUrl,
  campaignId,
  category,
  className,
  alt,
  fit = "contain",
}: MerchantBannerProps) {
  // If creativeUrls or multiple slides exist, render the SlideBanner for rich interactivity
  if (Array.isArray(creativeUrls) && creativeUrls.length > 1) {
    return (
      <MerchantSlideBanner
        merchantName={merchantName}
        bannerUrl={bannerUrl}
        creativeUrls={creativeUrls}
        campaignId={campaignId}
        category={category}
        directUrl={directUrl}
        className={className}
        alt={alt}
      />
    );
  }

  const candidates = getMerchantBannerCandidates(
    merchantName,
    bannerUrl,
    campaignId,
    creativeUrls,
    directUrl
  );
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setHasFailedAll(false);
  }, [merchantName, bannerUrl, directUrl, campaignId]);

  const currentSrc = candidates[candidateIndex];

  if (hasFailedAll || !currentSrc) {
    return (
      <img
        src={VCOMMISSION_NETWORK_BANNER}
        alt={`${merchantName} Banner`}
        className={className}
        style={{ objectFit: fit, width: "100%", height: "100%" }}
      />
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #070e1c 0%, #0d1b2a 100%)",
        borderRadius: "inherit",
      }}
    >
      {/* Ambient background for wide/tall letterboxed banners */}
      <img
        src={currentSrc}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        style={{
          position: "absolute",
          inset: "-12px",
          width: "calc(100% + 24px)",
          height: "calc(100% + 24px)",
          objectFit: "cover",
          filter: "blur(20px) brightness(0.3) saturate(1.2)",
          opacity: 0.5,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <img
        src={currentSrc}
        alt={alt || `${merchantName} Creative Banner via vCommission`}
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
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          objectFit: fit,
          display: "block",
          margin: "0 auto",
        }}
      />
    </div>
  );
}
