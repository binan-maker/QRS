"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import { Ionicons } from "@/lib/mobile-icons";
import { MerchantLogo, MerchantBanner, MerchantSlideBanner } from "@/lib/rewards-image";
import type { ScratchCardItem } from "@services/rewards";
import styles from "./scratch-modal.module.css";

interface ScratchModalProps {
  card: ScratchCardItem;
  isDemo?: boolean;
  onClose: () => void;
  onScratchComplete?: (card: ScratchCardItem) => void;
  onClaim?: (card: ScratchCardItem) => void;
  onOpenDetails?: (card: ScratchCardItem) => void;
}

interface BirthdayPiece {
  id: number;
  left: number;
  color: string;
  shape: "ribbon" | "square" | "circle" | "star";
  size: number;
  delay: number;
  duration: number;
}

const CELEBRATION_COLORS = [
  "#FF2D55", // Coral pink / magenta
  "#FF9500", // Bright orange
  "#FFCC00", // Golden yellow
  "#34C759", // Festive emerald green
  "#007AFF", // Royal electric blue
  "#AF52DE", // Festive violet
  "#FFD700", // Shimmer gold
  "#38BDF8", // Sky cyan
  "#EC4899", // Rose
];

const BIRTHDAY_PIECES: BirthdayPiece[] = Array.from({ length: 44 }, (_, i) => {
  const shapes: BirthdayPiece["shape"][] = ["ribbon", "square", "circle", "star"];
  return {
    id: i,
    left: ((i * 2.3 + (i % 7) * 4) % 96) + 2,
    color: CELEBRATION_COLORS[i % CELEBRATION_COLORS.length],
    shape: shapes[i % shapes.length],
    size: 7 + (i % 6) * 1.5,
    delay: (i * 0.08) % 2.2,
    duration: 2.8 + (i % 5) * 0.4,
  };
});

export function ScratchModal({
  card,
  isDemo = false,
  onClose,
  onScratchComplete,
  onClaim,
  onOpenDetails,
}: ScratchModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isRevealed, setIsRevealed] = useState(
    card.status === "scratched" || card.status === "redeemed"
  );
  const [scratchProgress, setScratchProgress] = useState(0);
  const [claimed, setClaimed] = useState(card.status === "redeemed");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isDrawingRef = useRef(false);
  const hasRevealedRef = useRef(card.status === "scratched" || card.status === "redeemed");

  const tier = card.tier;
  const offer = card.offer;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  }, []);

  // ── Birthday Celebration Fireworks & Moving Pieces Trigger ──────────────────
  const triggerCelebration = useCallback(() => {
    try {
      // Wave 1: Immediate center explosion
      confetti({
        particleCount: 75,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#FF2D55", "#FF9500", "#FFCC00", "#34C759", "#007AFF", "#AF52DE", "#FFD700"],
      });

      // Wave 2: Left confetti cannon angled up and right
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 65,
          origin: { x: 0.1, y: 0.7 },
          colors: ["#FFD700", "#FF2D55", "#007AFF", "#34C759"],
        });
      }, 250);

      // Wave 3: Right confetti cannon angled up and left
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 65,
          origin: { x: 0.9, y: 0.7 },
          colors: ["#FF9500", "#AF52DE", "#FFCC00", "#38BDF8"],
        });
      }, 500);

      // Wave 4: Gentle star and circle cascade from top
      setTimeout(() => {
        confetti({
          particleCount: 35,
          spread: 100,
          origin: { y: 0.2 },
          shapes: ["circle", "star"],
          colors: ["#FFD700", "#FBBF24", "#60A5FA", "#F43F5E"],
        });
      }, 850);
    } catch {}
  }, []);

  // ── Draw Brushed Metallic Security Foil Surface (Mature & Executive) ───────
  const drawFoilPattern = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // 1. Brushed metallic gradient based on tier
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    if (tier === "gold") {
      gradient.addColorStop(0, "#92400E");
      gradient.addColorStop(0.3, "#D97706");
      gradient.addColorStop(0.65, "#F59E0B");
      gradient.addColorStop(1, "#78350F");
    } else if (tier === "silver") {
      gradient.addColorStop(0, "#475569");
      gradient.addColorStop(0.35, "#94A3B8");
      gradient.addColorStop(0.7, "#64748B");
      gradient.addColorStop(1, "#334155");
    } else {
      // BinRo Royal Sapphire Brushed Metal
      gradient.addColorStop(0, "#003A99");
      gradient.addColorStop(0.4, "#0052CC");
      gradient.addColorStop(0.8, "#1D4ED8");
      gradient.addColorStop(1, "#0A2563");
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle brushed metal micro-texture (Fine horizontal hairline strokes)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Elegant Geometric Security Guilloche Waves
    ctx.strokeStyle = tier === "gold" ? "rgba(120, 53, 15, 0.28)" : "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1.2;

    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const waveY = height * 0.2 + i * 45;
      ctx.moveTo(0, waveY);
      for (let x = 0; x <= width; x += 10) {
        const sinY = waveY + Math.sin((x / width) * Math.PI * 4 + i) * 12;
        ctx.lineTo(x, sinY);
      }
      ctx.stroke();
    }

    // 4. Center Security Emblem & Clean Text
    const centerX = width / 2;
    const centerY = height / 2 - 10;

    // Outer circular ring
    ctx.strokeStyle = tier === "gold" ? "rgba(120, 53, 15, 0.55)" : "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 38, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dashed ring
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center lock/security icon mark
    ctx.fillStyle = tier === "gold" ? "#78350F" : "#ffffff";
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BINRO", centerX, centerY);

    // Instruction label
    ctx.font = "bold 13px Inter, -apple-system, sans-serif";
    ctx.fillStyle = tier === "gold" ? "#78350F" : "#ffffff";
    ctx.fillText("Scratch to Reveal Voucher", centerX, centerY + 58);

    ctx.font = "11.5px Inter, sans-serif";
    ctx.fillStyle = tier === "gold" ? "rgba(120, 53, 15, 0.85)" : "rgba(255, 255, 255, 0.75)";
    ctx.fillText("Swipe with finger or click Reveal Voucher", centerX, centerY + 78);
  }, [tier]);

  // Initialize Canvas
  useEffect(() => {
    if (hasRevealedRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width) || 360;
    const height = Math.floor(rect.height) || 400;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    drawFoilPattern(ctx, width, height);
  }, [drawFoilPattern]);

  // ── Handle Reveal Completion ──────────────────────────────────────────────
  const finalizeReveal = useCallback(() => {
    if (hasRevealedRef.current) return;
    hasRevealedRef.current = true;
    setIsRevealed(true);
    setScratchProgress(100);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.transition = "opacity 0.28s ease";
      canvas.style.opacity = "0";
    }

    triggerCelebration();

    if (onScratchComplete) {
      onScratchComplete({
        ...card,
        status: "scratched",
        scratchedAt: new Date().toISOString(),
      });
    }
  }, [card, onScratchComplete, triggerCelebration]);

  // Check scratch percentage
  const checkScratchPercentage = useCallback(() => {
    if (hasRevealedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;
      let transparentCount = 0;
      const totalSampled = pixels.length / 4;

      for (let i = 3; i < pixels.length; i += 32) {
        if (pixels[i] === 0) {
          transparentCount += 8;
        }
      }

      const pct = Math.min(100, Math.round((transparentCount / totalSampled) * 100));
      setScratchProgress(pct);

      if (pct >= 30) {
        finalizeReveal();
      }
    } catch {}
  }, [finalizeReveal]);

  // Scratch stroke
  const scratchAt = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || hasRevealedRef.current) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 32, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (hasRevealedRef.current) return;
    isDrawingRef.current = true;
    scratchAt(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current || hasRevealedRef.current) return;
    scratchAt(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    checkScratchPercentage();
  };

  // Instant Reveal
  const handleInstantScratchOff = useCallback(() => {
    if (hasRevealedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) {
      finalizeReveal();
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      finalizeReveal();
      return;
    }

    let step = 0;
    const totalSteps = 6;
    const width = canvas.width;
    const height = canvas.height;

    ctx.globalCompositeOperation = "destination-out";

    const interval = setInterval(() => {
      step++;
      const currentY = (height / totalSteps) * step;

      ctx.beginPath();
      ctx.arc(width * 0.25, currentY, 60, 0, Math.PI * 2);
      ctx.arc(width * 0.5, currentY, 70, 0, Math.PI * 2);
      ctx.arc(width * 0.75, currentY, 60, 0, Math.PI * 2);
      ctx.fill();

      if (step >= totalSteps) {
        clearInterval(interval);
        finalizeReveal();
      }
    }, 40);
  }, [finalizeReveal]);

  // Claim
  const handleClaimReward = useCallback(async () => {
    setClaimed(true);

    if (offer.couponCode && typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(offer.couponCode).catch(() => {});
      showToast(`Voucher code ${offer.couponCode} copied to clipboard!`);
    } else {
      showToast("Reward successfully claimed!");
    }

    if (onClaim) {
      onClaim(card);
    }
  }, [card, offer.couponCode, onClaim, showToast]);

  // Keyboard Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className={styles.toastPill} role="status">
          <Ionicons name="checkmark-circle" size={17} color="#ffffff" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className={styles.modalHeader}>
        <button
          type="button"
          onClick={onClose}
          className={styles.closeBtn}
          aria-label="Close modal"
        >
          <Ionicons name="close" size={20} color="#ffffff" />
        </button>

        {isDemo && <span className={styles.demoBadge}>Demo Voucher</span>}

        <div style={{ width: 40 }} />
      </header>

      {/* Title Banner (Mature & Professional Copy) */}
      <div className={styles.titleSection}>
        {!isRevealed ? (
          <>
            <h2 className={styles.mainTitle}>Scratch Card</h2>
            <p className={styles.mainSubtitle}>
              Swipe across the surface to reveal your partner voucher
            </p>
          </>
        ) : (
          <>
            <h2 className={styles.mainTitle}>Voucher Unlocked</h2>
            <p className={styles.mainSubtitle}>
              Your partner reward code has been revealed. Copy and redeem below.
            </p>
          </>
        )}
      </div>

      {/* Central Floating Card Stage */}
      <div ref={containerRef} className={styles.cardStage}>
        {/* Foil Canvas */}
        {!isRevealed && (
          <div
            className={styles.canvasWrap}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <canvas ref={canvasRef} className={styles.scratchCanvas} />

            {scratchProgress > 0 && scratchProgress < 30 && (
              <span className={styles.foilHintBadge}>
                {scratchProgress}% Cleared
              </span>
            )}
          </div>
        )}

        {/* Revealed Card Interior */}
        <div className={styles.cardInterior}>
          {/* Top Media Banner: Fitted creative slide banner without trophy */}
          <div
            className={`${styles.mediaBanner} ${
              tier === "gold"
                ? styles.mediaBannerGold
                : tier === "silver"
                  ? styles.mediaBannerSilver
                  : ""
            }`}
          >
            <MerchantSlideBanner
              merchantName={offer.merchantName}
              bannerUrl={offer.bannerUrl}
              creativeUrls={offer.creativeUrls}
              campaignId={offer.campaignId}
              category={offer.category}
              className={styles.mediaBannerImg}
              alt={`${offer.merchantName} Banner`}
            />

            {/* Overlapping Brand Circle Logo Badge */}
            <div className={styles.brandBadgeCircle}>
              <MerchantLogo
                merchantName={offer.merchantName}
                directUrl={offer.merchantLogoUrl}
                campaignId={offer.campaignId}
                className={styles.brandBadgeImg}
                alt={offer.merchantName}
                fallbackInitialClassName={styles.brandBadgeInitial}
              />
            </div>
          </div>

          {/* Prize Text & Description */}
          <div className={styles.prizeContent}>
            <p className={styles.wonSubLabel}>Partner Offer</p>
            <h3 className={styles.prizeTitle}>{offer.title}</h3>
            <p className={styles.prizeSubtext}>
              {offer.description || `Exclusive discount from ${offer.merchantName}`}
            </p>

            {/* Coupon Code Box */}
            {offer.couponCode && (
              <div className={styles.couponBox}>
                <span className={styles.couponText}>{offer.couponCode}</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      await navigator.clipboard.writeText(offer.couponCode!).catch(() => {});
                      showToast(`Code ${offer.couponCode} copied!`);
                    }
                  }}
                  className={styles.copyCodeBtn}
                  aria-label="Copy voucher code"
                >
                  COPY
                </button>
              </div>
            )}
          </div>

          {/* Claim Button */}
          <button
            type="button"
            onClick={handleClaimReward}
            className={`${styles.claimBtn} ${claimed ? styles.claimBtnSuccess : ""}`}
          >
            <Ionicons name={claimed ? "checkmark-circle" : "shield-checkmark"} size={16} />
            <span>{claimed ? "Voucher Claimed ✓" : "Claim Voucher"}</span>
          </button>
        </div>
      </div>

      {/* Moving Birthday Celebration Pieces Overlay */}
      {isRevealed && (
        <div className={styles.celebrationOverlay} aria-hidden="true">
          {BIRTHDAY_PIECES.map((p) => (
            <div
              key={p.id}
              className={styles.celebrationPiece}
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            >
              <div
                className={styles.celebrationInner}
                style={{
                  animationDuration: `${1.4 + (p.id % 3) * 0.4}s`,
                }}
              >
                {p.shape === "star" ? (
                  <span
                    style={{
                      color: p.color,
                      fontSize: `${p.size + 4}px`,
                      display: "block",
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                    }}
                  >
                    ★
                  </span>
                ) : p.shape === "circle" ? (
                  <div
                    style={{
                      width: `${p.size}px`,
                      height: `${p.size}px`,
                      borderRadius: "50%",
                      backgroundColor: p.color,
                      boxShadow: `0 2px 6px ${p.color}66`,
                    }}
                  />
                ) : p.shape === "ribbon" ? (
                  <div
                    style={{
                      width: `${Math.round(p.size * 0.45)}px`,
                      height: `${Math.round(p.size * 1.8)}px`,
                      borderRadius: "2px",
                      backgroundColor: p.color,
                      boxShadow: `0 2px 6px ${p.color}66`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: `${p.size}px`,
                      height: `${p.size}px`,
                      borderRadius: "2px",
                      backgroundColor: p.color,
                      boxShadow: `0 2px 6px ${p.color}66`,
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Action Section */}
      <div className={styles.bottomActionWrap}>
        {!isRevealed ? (
          <button
            type="button"
            onClick={handleInstantScratchOff}
            className={styles.scratchOffBtn}
            aria-label="Quickly reveal the card"
          >
            <Ionicons name="sparkles-outline" size={16} />
            <span>Reveal Voucher</span>
          </button>
        ) : (
          <div className={styles.bottomButtonGroup}>
            {onOpenDetails && (
              <button
                type="button"
                onClick={() => onOpenDetails(card)}
                className={styles.viewDetailsBtn}
                aria-label="View full voucher details"
              >
                <Ionicons name="document-text-outline" size={16} />
                <span>View Voucher Details</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={styles.scratchOffBtn}
              style={{ flex: onOpenDetails ? 1 : undefined }}
              aria-label="Return to rewards"
            >
              <span>Back to Rewards</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
