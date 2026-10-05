"use client";

import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Ionicons } from "@/lib/mobile-icons";
import type { ScanItem } from "@/lib/scan-history";
import { parseAnyPaymentQr } from "@services/analysis";
import { useQrMeta } from "@shared/utils/qr-content";
import { formatRelativeTime } from "@shared/utils/formatters";
import { getQrIdFromContentSync, resolveQrShareCode } from "@/lib/qr-share";
import styles from "./HistoryItemCard.module.css";

interface Props {
  item: ScanItem;
  onDelete?: (item: ScanItem) => void;
  showTime?: boolean;
  index?: number;
  animate?: boolean;
}

function getPaymentData(content: string) {
  try {
    const parsed = parseAnyPaymentQr(content);
    return {
      name: parsed?.recipientName || parsed?.vpa || "Payment",
      amount: parsed?.amount || null,
      vpa: parsed?.vpa || null,
    };
  } catch {
    return null;
  }
}

function formatAmount(amount?: number | string | null) {
  if (!amount) return null;
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export function HistoryItemCard({
  item,
  onDelete,
  showTime = true,
  index = 0,
  animate = true,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { typeMeta, displayLabel, subtitle } = useQrMeta(item.content, item.contentType);

  // Staggered delay matching mobile ENTERING_ANIMS cache (FadeInDown.delay(i * 30).duration(260))
  const delayMs = animate ? Math.min(index, 8) * 35 : 0;

  const paymentData = useMemo(
    () =>
      item.contentType === "payment" || item.content.toLowerCase().startsWith("upi://")
        ? getPaymentData(item.content)
        : null,
    [item.contentType, item.content]
  );

  const formattedAmount = useMemo(
    () => (paymentData?.amount ? formatAmount(paymentData.amount) : null),
    [paymentData]
  );

  const [tick, setTick] = useState(0);

  // Live timer tick for recent scans (within 24 hours) so relative time doesn't drift
  useEffect(() => {
    const scanTime = new Date(item.scannedAt).getTime();
    if (isNaN(scanTime) || Date.now() - scanTime > 86_400_000) {
      return;
    }

    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);

    return () => clearInterval(timer);
  }, [item.scannedAt]);

  const timeAgo = useMemo(
    () => formatRelativeTime(item.scannedAt),
    [item.scannedAt, tick]
  );

  const gradient = typeMeta.gradient as readonly [string, string];
  const chevronColor = gradient?.[0] || "var(--primary)";

  // Canonical Base62 share URL (e.g. /qr/3E7TEeNFD7e7tA) — never falls back to /qr/custom?content=...
  const qrTarget = useMemo(() => {
    const candidate = (item.qrCodeId || (item as any).qrId || item.id || "").trim();
    const rawContent = (
      item.content ||
      (item as any).rawContent ||
      (item as any).destination ||
      ""
    ).trim();
    const shareCode = resolveQrShareCode(candidate, rawContent);
    if (shareCode) {
      return `/qr/${encodeURIComponent(shareCode)}`;
    }
    return `/qr/${encodeURIComponent(candidate || "custom")}`;
  }, [item]);

  useEffect(() => {
    if (!item.content || typeof window === "undefined") return;
    try {
      const candidate = (item.qrCodeId || "").trim();
      const resolvedId = /^[0-9a-f]{20}$/i.test(candidate)
        ? candidate.toLowerCase()
        : getQrIdFromContentSync(item.content);
      localStorage.setItem(
        `qr_content_${resolvedId}`,
        JSON.stringify({
          content: item.content,
          contentType: item.contentType || "url",
        })
      );
    } catch {}
  }, [item.qrCodeId, item.content, item.contentType]);

  // Close context menu on outside click or escape key
  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(item.content);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          setMenuOpen(false);
        }, 1200);
      } catch {
        setMenuOpen(false);
      }
    },
    [item.content]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setMenuOpen(false);
      if (onDelete) {
        onDelete(item);
      }
    },
    [onDelete, item]
  );

  return (
    <div
      className={`${styles.card} ${animate ? styles.cardAnimate : ""} ${menuOpen ? styles.cardMenuOpen : ""}`}
      style={animate && delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <Link href={qrTarget} className={styles.cardLink}>
        <div className={styles.body}>
          <div className={styles.titleRow}>
            <span className={styles.title}>
              {paymentData ? paymentData.name : displayLabel}
            </span>
            {formattedAmount && (
              <div className={styles.amountPill}>
                <span className={styles.amountText}>{formattedAmount}</span>
              </div>
            )}
          </div>

          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </Link>

      <div className={`${styles.right} ${!onDelete ? styles.rightInline : ""}`}>
        {showTime && (
          <Link href={qrTarget} className={styles.timeLink} tabIndex={-1}>
            <span className={styles.time}>{timeAgo}</span>
          </Link>
        )}

        <div className={styles.rightActions}>
          {onDelete && (
            <div
              className={styles.menuContainer}
              ref={menuRef}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className={`${styles.menuBtn} ${menuOpen ? styles.menuBtnActive : ""}`}
                title="More options"
                aria-label="More options"
                aria-expanded={menuOpen}
              >
                <Ionicons name="ellipsis-vertical" size={15} />
              </button>

              {menuOpen && (
                <div
                  className={styles.menuDropdown}
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    href={qrTarget}
                    className={styles.menuItem}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Ionicons name="eye-outline" size={15} color="var(--primary)" />
                    <span>View Details</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className={styles.menuItem}
                    role="menuitem"
                  >
                    <Ionicons
                      name={copied ? "checkmark-circle-outline" : "copy-outline"}
                      size={15}
                      color={copied ? "var(--safe)" : "var(--text-secondary)"}
                    />
                    <span>{copied ? "Copied!" : "Copy Content"}</span>
                  </button>

                  <div className={styles.menuDivider} />

                  <button
                    type="button"
                    onClick={handleDelete}
                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                    role="menuitem"
                  >
                    <Ionicons name="trash-outline" size={15} color="var(--danger)" />
                    <span>Delete Scan</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <Link
            href={qrTarget}
            className={styles.chevronWrap}
            style={{
              backgroundColor: `${chevronColor}18`,
              color: chevronColor,
            }}
            aria-label="Open scan details"
          >
            <Ionicons name="chevron-forward" size={13} color={chevronColor} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HistoryItemCard;
