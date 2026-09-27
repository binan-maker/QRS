"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { getWebSupabase } from "../../lib/supabase";
import styles from "./scanner.module.css";

// ─── Constants matching features/scanner/ ─────────────────────────────────────
export const FINDER_SIZE = 270;
const SMART_ZOOM_SMALL = 0.18;
const SMART_ZOOM_VERY_SMALL = 0.08;
const SMART_ZOOM_RESET_MS = 4000;

const SUGGEST_DELAY_MS = 8_000;
const AUTO_DISMISS_MS = 5_000;
const COOLDOWN_MS = 90_000;

const ANON_DAILY_SCAN_LIMIT = 50;
const ANON_CONVERSION_MILESTONES = new Set([3, 10, 25]);
const ANON_CONVERSION_MESSAGES: Record<number, string> = {
  3: "Sign up to save your scan history across devices.",
  10: "You've scanned 10 QR codes! Create a free account to keep your history.",
  25: "25 scans and counting — sign in to unlock all features.",
};

export const ZOOM_LEVELS = [
  { zoom: 0, scale: 1, label: "1×" },
  { zoom: 0.25, scale: 1.5, label: "1.5×" },
  { zoom: 0.45, scale: 2, label: "2×" },
  { zoom: 0.65, scale: 3, label: "3×" },
] as const;

export type CameraErrorType = "unavailable" | "inuse";
export type ToastType = "error" | "warning" | "info";

const TOAST_COLORS = {
  error: {
    bg: "#1a0a0a",
    border: "rgba(239,68,68,0.4)",
    icon: "#ef4444",
    text: "#fca5a5",
    track: "rgba(239,68,68,0.2)",
    fill: "#ef4444",
    iconChar: "✕",
  },
  warning: {
    bg: "#1a1200",
    border: "rgba(245,158,11,0.4)",
    icon: "#f59e0b",
    text: "#fde68a",
    track: "rgba(245,158,11,0.2)",
    fill: "#f59e0b",
    iconChar: "⚠",
  },
  info: {
    bg: "#0a1020",
    border: "rgba(0,212,255,0.35)",
    icon: "#00d4ff",
    text: "#a5f3ff",
    track: "rgba(0,212,255,0.2)",
    fill: "#00d4ff",
    iconChar: "ℹ",
  },
} as const;

// ─── Camera Permission Persistence ────────────────────────────────────────────
const CAMERA_PERMISSION_KEY = "binro_camera_permission_granted";
const CAMERA_COOKIE_NAME = "binro_cam_granted";

function hasRememberedCameraPermission(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(CAMERA_PERMISSION_KEY) === "true") return true;
  } catch {}
  try {
    if (sessionStorage.getItem(CAMERA_PERMISSION_KEY) === "true") return true;
  } catch {}
  try {
    if (document.cookie.split(";").some((c) => c.trim().startsWith(`${CAMERA_COOKIE_NAME}=1`))) {
      return true;
    }
  } catch {}
  return false;
}

function rememberCameraPermission(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CAMERA_PERMISSION_KEY, "true");
  } catch {}
  try {
    sessionStorage.setItem(CAMERA_PERMISSION_KEY, "true");
  } catch {}
  try {
    document.cookie = `${CAMERA_COOKIE_NAME}=1; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
}

function clearRememberedCameraPermission(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CAMERA_PERMISSION_KEY);
  } catch {}
  try {
    sessionStorage.removeItem(CAMERA_PERMISSION_KEY);
  } catch {}
  try {
    document.cookie = `${CAMERA_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  } catch {}
}

async function detectBrowserCameraPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  if (typeof navigator === "undefined") {
    return { granted: false, canAskAgain: true };
  }

  if (navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: "camera" as PermissionName });
      if (status.state === "granted") {
        rememberCameraPermission();
        return { granted: true, canAskAgain: true };
      }
      if (status.state === "denied") {
        clearRememberedCameraPermission();
        return { granted: false, canAskAgain: false };
      }
    } catch {}
  }

  if (hasRememberedCameraPermission()) {
    return { granted: true, canAskAgain: true };
  }

  if (navigator.mediaDevices?.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasLabeledCamera = devices.some(
        (d) => d.kind === "videoinput" && typeof d.label === "string" && d.label.trim().length > 0
      );
      if (hasLabeledCamera) {
        rememberCameraPermission();
        return { granted: true, canAskAgain: true };
      }
    } catch {}
  }

  return { granted: false, canAskAgain: true };
}

function consumeWebAnonScanSlot(): { allowed: boolean; totalCount: number } {
  if (typeof window === "undefined") return { allowed: true, totalCount: 0 };
  try {
    const todayKey = `anon_daily_${new Date().toDateString()}`;
    const totalKey = "anon_total_scan_count";
    const dailyRaw = localStorage.getItem(todayKey);
    const totalRaw = localStorage.getItem(totalKey);
    const daily = dailyRaw ? parseInt(dailyRaw, 10) : 0;
    if (daily >= ANON_DAILY_SCAN_LIMIT) {
      return { allowed: false, totalCount: totalRaw ? parseInt(totalRaw, 10) : 0 };
    }
    const newTotal = (totalRaw ? parseInt(totalRaw, 10) : 0) + 1;
    localStorage.setItem(todayKey, String(daily + 1));
    localStorage.setItem(totalKey, String(newTotal));
    return { allowed: true, totalCount: newTotal };
  } catch {
    return { allowed: true, totalCount: 0 };
  }
}

type DetectorResult = {
  rawValue?: string;
  boundingBox?: { width?: number; height?: number };
};
type Detector = { detect: (source: HTMLVideoElement) => Promise<DetectorResult[]> };
type DetectorConstructor = new (options?: { formats?: string[] }) => Detector;
type BarcodeDetectorWindow = Window & { BarcodeDetector?: DetectorConstructor };

async function getQrDetailsPath(value: string): Promise<string | null> {
  const raw = value.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.origin);
    const match = url.pathname.match(/\/qr\/([^/?#]+)/i);
    if (match?.[1] && (url.origin === window.location.origin || /binro/i.test(url.hostname))) {
      const contentParam = url.searchParams.get("content");
      return `/qr/${encodeURIComponent(match[1])}${contentParam ? `?content=${encodeURIComponent(contentParam)}` : ""}`;
    }
  } catch {
    /* raw QR data may be non-URL */
  }
  if (/^[0-9a-f]{20}$/i.test(raw)) {
    return `/qr/${encodeURIComponent(raw.toLowerCase())}`;
  }
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const qrId = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 20);
    return `/qr/${qrId}?content=${encodeURIComponent(raw)}`;
  }
  return `/qr/custom?content=${encodeURIComponent(raw)}`;
}

function decodeVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): { data: string; widthFraction?: number } | null {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
    return null;
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
  if (!result || !result.data) return null;

  let widthFraction: number | undefined;
  if (result.location?.topRightCorner && result.location?.topLeftCorner && video.videoWidth > 0) {
    const dx = result.location.topRightCorner.x - result.location.topLeftCorner.x;
    const dy = result.location.topRightCorner.y - result.location.topLeftCorner.y;
    widthFraction = Math.hypot(dx, dy) / video.videoWidth;
  }
  return { data: result.data, widthFraction };
}

// ─── Exact Mobile Icons (Ionicons & MaterialCommunityIcons equivalents) ───────
function IonIcon({
  name,
  size = 22,
  color = "currentColor",
}: {
  name:
    | "camera-outline"
    | "camera"
    | "settings-outline"
    | "chevron-back"
    | "eye-off"
    | "eye-off-outline"
    | "search-outline"
    | "images-outline"
    | "flashlight"
    | "flashlight-outline"
    | "refresh-outline"
    | "person-circle-outline"
    | "close"
    | "qrcode-scan"
    | "qrcode";
  size?: number;
  color?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    style: { flexShrink: 0 },
  };

  switch (name) {
    case "chevron-back":
      return (
        <svg {...common} strokeWidth={2.2}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      );
    case "camera-outline":
      return (
        <svg {...common} strokeWidth={1.75}>
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      );
    case "camera":
      return (
        <svg {...common} fill={color} stroke="none">
          <path d="M9.5 3a1 1 0 0 0-.8.4L6.75 6H4a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-2.75L15.3 3.4a1 1 0 0 0-.8-.4h-5zm2.5 5.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
        </svg>
      );
    case "settings-outline":
      return (
        <svg {...common} strokeWidth={1.8}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "eye-off":
    case "eye-off-outline":
      return (
        <svg {...common} strokeWidth={1.9}>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      );
    case "search-outline":
      return (
        <svg {...common} strokeWidth={2.1}>
          <circle cx="11" cy="11" r="7" />
          <line x1="20" y1="20" x2="16.35" y2="16.35" />
        </svg>
      );
    case "images-outline":
      return (
        <svg {...common} strokeWidth={1.8}>
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="m4 17 4.5-4.2a1 1 0 0 1 1.4 0L13 15.8l2.3-2.3a1 1 0 0 1 1.4 0L20 17" />
        </svg>
      );
    case "flashlight":
      return (
        <svg {...common} fill={color} stroke={color} strokeWidth={1.5}>
          <path d="M18 6c0 2-2 2-2 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4V3h12z" />
          <line x1="6" y1="6" x2="18" y2="6" stroke="#000" strokeWidth={1.5} />
          <circle cx="12" cy="12.5" r="1.2" fill="#000" stroke="none" />
        </svg>
      );
    case "flashlight-outline":
      return (
        <svg {...common} strokeWidth={1.8}>
          <path d="M18 6c0 2-2 2-2 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4V3h12z" />
          <line x1="6" y1="6" x2="18" y2="6" />
          <line x1="12" y1="12" x2="12" y2="12.01" strokeWidth={2.5} />
        </svg>
      );
    case "refresh-outline":
      return (
        <svg {...common} strokeWidth={2}>
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 16h5v5" />
        </svg>
      );
    case "person-circle-outline":
      return (
        <svg {...common} strokeWidth={1.8}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="10" r="3" />
          <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855" />
        </svg>
      );
    case "close":
      return (
        <svg {...common} strokeWidth={2.1}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case "qrcode-scan":
      return (
        <svg {...common} strokeWidth={1.9}>
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <rect x="7" y="7" width="4" height="4" rx="0.6" />
          <rect x="13" y="7" width="4" height="4" rx="0.6" />
          <rect x="7" y="13" width="4" height="4" rx="0.6" />
          <path d="M13 13h4v4h-4z" />
        </svg>
      );
    case "qrcode":
      return (
        <svg {...common} strokeWidth={2}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
  }
}

// ─── Subcomponents matching features/scanner/components/ ──────────────────────

/**
 * Matches features/scanner/components/feedback/ScannerToast.tsx
 */
function ScannerToast({
  message,
  type = "error",
  onDone,
}: {
  message: string;
  type?: ToastType;
  onDone: () => void;
}) {
  const c = TOAST_COLORS[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onDone();
    }, 3200);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  return (
    <div
      className={styles.toastWrapper}
      style={{ backgroundColor: c.bg, borderColor: c.border }}
      role="alert"
    >
      <div className={styles.toastBody}>
        <div className={styles.toastIconWrap} style={{ backgroundColor: `${c.icon}22` }}>
          <span className={styles.toastIcon} style={{ color: c.icon }}>
            {c.iconChar}
          </span>
        </div>
        <p className={styles.toastMsg} style={{ color: c.text }}>
          {message}
        </p>
      </div>
      <div className={styles.toastTrackBg} style={{ backgroundColor: c.track }}>
        <div className={styles.toastTrackFill} style={{ backgroundColor: c.fill }} />
      </div>
    </div>
  );
}

/**
 * Matches features/scanner/components/feedback/ConversionBanner.tsx
 */
function ConversionBanner({
  message,
  visible,
  onSignIn,
  onDismiss,
}: {
  message: string | null;
  visible: boolean;
  onSignIn: () => void;
  onDismiss: () => void;
}) {
  if (!visible || !message) return null;
  return (
    <div className={styles.conversionBanner}>
      <div className={styles.conversionBody}>
        <IonIcon name="person-circle-outline" size={22} color="#00d4ff" />
        <p className={styles.conversionText}>{message}</p>
      </div>
      <div className={styles.conversionActions}>
        <button type="button" onClick={onSignIn} className={styles.conversionSignInBtn}>
          Sign In
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className={styles.conversionDismissBtn}
          aria-label="Dismiss"
        >
          <IonIcon name="close" size={16} color="rgba(255,255,255,0.4)" />
        </button>
      </div>
    </div>
  );
}

/**
 * Matches features/scanner/components/system/ProcessingOverlay.tsx
 */
function ProcessingOverlay() {
  return (
    <div className={styles.processingOverlay} role="status" aria-live="polite">
      <div className={styles.processingBox}>
        <div className={styles.processingIconContainer}>
          <div className={styles.processingAmbientRing} />
          <div className={styles.processingSpinRing} />
          <div className={styles.processingInnerRing}>
            <IonIcon name="qrcode-scan" size={30} color="#00D4FF" />
          </div>
        </div>

        <div className={styles.processingTextGroup}>
          <p className={styles.processingTitle}>Reading QR Code</p>
          <p className={styles.processingSubtitle}>Preparing the QR details…</p>
        </div>

        <div className={styles.processingBrandRow}>
          <IonIcon name="qrcode" size={11} color="rgba(0,212,255,0.35)" />
          <span className={styles.processingBrandText}>BinRo Scanner</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Matches features/scanner/components/system/CameraUnavailableBanner.tsx
 */
function CameraUnavailableBanner({
  onPickImage,
  onRetry,
  errorType,
}: {
  onPickImage: () => void;
  onRetry: () => void;
  errorType: CameraErrorType;
}) {
  const isInUse = errorType === "inuse";
  return (
    <div className={styles.unavailableContainer}>
      <div className={`${styles.unavailableIconWrap} ${isInUse ? styles.unavailableIconWrapBlue : ""}`}>
        <IonIcon name="camera-outline" size={40} color={isInUse ? "#00d4ff" : "#f59e0b"} />
      </div>
      <h2 className={`${styles.unavailableTitle} ${isInUse ? styles.unavailableTitleBlue : ""}`}>
        {isInUse ? "Camera In Use" : "Camera Unavailable"}
      </h2>
      <p className={styles.unavailableSubtitle}>
        {isInUse
          ? "Your camera is being used by another app. Close that app and tap Try Again, or scan from your gallery."
          : "The camera could not be started. This can happen on first launch or after switching apps — tap Try Again to retry."}
      </p>

      <button type="button" onClick={onRetry} className={`${styles.unavailableBtn} ${styles.unavailableBtnPrimary}`}>
        <IonIcon name="refresh-outline" size={18} color="#000" />
        <span>Try Again</span>
      </button>

      <button
        type="button"
        onClick={onPickImage}
        className={`${styles.unavailableBtn} ${styles.unavailableBtnSecondary}`}
      >
        <IonIcon name="images-outline" size={18} color="#00d4ff" />
        <span>Scan from Gallery</span>
      </button>
    </div>
  );
}

/**
 * Matches features/scanner/components/system/PermissionScreen.tsx
 */
function PermissionScreen({
  canAskAgain,
  loading,
  onRequestPermission,
  onShowSettingsHint,
}: {
  canAskAgain: boolean;
  loading: boolean;
  onRequestPermission: () => void;
  onShowSettingsHint: () => void;
}) {
  return (
    <div className={styles.permissionScreenContainer}>
      <div className={styles.permissionCenterContent}>
        <div className={styles.permissionIconSection}>
          <div className={styles.permissionIconOuterRing}>
            <div className={styles.permissionIconInnerRing}>
              <IonIcon name="camera-outline" size={42} color="#2563EB" />
            </div>
          </div>
        </div>

        <div className={styles.permissionTextGroup}>
          <h1 id="permission-title" className={styles.permissionTitle}>
            Camera Permission
          </h1>
          <p className={styles.permissionSubtitle}>
            We need access to your camera to scan QR codes.
          </p>
        </div>

        <div className={styles.permissionBtns}>
          <button
            type="button"
            className={styles.gradientBtnPrimary}
            disabled={loading}
            onClick={onRequestPermission}
          >
            {loading ? (
              <span className={styles.buttonActivityIndicator} aria-label="Loading" />
            ) : (
              <>
                <IonIcon name="camera" size={19} color="#fff" />
                <span className={styles.gradientBtnLabel}>Enable Camera</span>
              </>
            )}
          </button>

          {!canAskAgain && (
            <button
              type="button"
              className={styles.permissionSecondaryBtn}
              onClick={onShowSettingsHint}
            >
              <IonIcon name="settings-outline" size={16} color="#475569" />
              <span className={styles.permissionSecondaryText}>Open Settings</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Matches features/scanner/components/overlay/FinderFrame.tsx
 * 4 rounded L-shaped corners with subtle 0.65 -> 1 breathing animation.
 */
function FinderFrame() {
  return (
    <div className={styles.finderFrame} aria-hidden="true">
      {/* Top-left corner */}
      <span className={`${styles.cornerBar} ${styles.ctlH}`} />
      <span className={`${styles.cornerBar} ${styles.ctlV}`} />

      {/* Top-right corner */}
      <span className={`${styles.cornerBar} ${styles.ctrH}`} />
      <span className={`${styles.cornerBar} ${styles.ctrV}`} />

      {/* Bottom-left corner */}
      <span className={`${styles.cornerBar} ${styles.cblH}`} />
      <span className={`${styles.cornerBar} ${styles.cblV}`} />

      {/* Bottom-right corner */}
      <span className={`${styles.cornerBar} ${styles.cbrH}`} />
      <span className={`${styles.cornerBar} ${styles.cbrV}`} />
    </div>
  );
}

/**
 * Matches features/scanner/components/overlay/OverlayTopBar.tsx
 */
function OverlayTopBar({
  anonymousMode,
  onToggleAnonymous,
  user,
}: {
  anonymousMode: boolean;
  onToggleAnonymous: () => void;
  user: any;
}) {
  return (
    <header className={styles.overlayTopBar}>
      <Link href="/" className={styles.topGlassBtn} aria-label="Go back">
        <IonIcon name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
      </Link>

      <div className={styles.topBrand}>
        <span className={styles.topBrandText}>BinRo</span>
      </div>

      {user ? (
        <button
          type="button"
          onClick={onToggleAnonymous}
          aria-label={anonymousMode ? "Disable private mode" : "Enable private mode"}
          aria-pressed={anonymousMode}
          className={`${styles.topGlassBtn} ${anonymousMode ? styles.topGlassBtnActive : ""}`}
        >
          <IonIcon
            name={anonymousMode ? "eye-off" : "eye-off-outline"}
            size={19}
            color={anonymousMode ? "#F5A623" : "rgba(255,255,255,0.7)"}
          />
        </button>
      ) : (
        <div className={styles.topSpacer} />
      )}
    </header>
  );
}

/**
 * Matches features/scanner/components/overlay/OverlayBottomBar.tsx
 */
function OverlayBottomBar({
  zoom,
  zoomLabel,
  onCycleZoom,
  anonymousMode,
  onPickImage,
  flashOn,
  onToggleFlash,
  facing,
  lowLightSuggested = false,
}: {
  zoom: number;
  zoomLabel: string;
  onCycleZoom: () => void;
  anonymousMode: boolean;
  onPickImage: () => void;
  flashOn: boolean;
  onToggleFlash: () => void;
  facing: "back" | "front";
  lowLightSuggested?: boolean;
}) {
  const isFlashActive = flashOn && facing === "back";
  const isFlashDisabled = facing === "front";
  const showLowLightHint = lowLightSuggested && !isFlashActive && !isFlashDisabled;

  return (
    <div className={styles.overlayBottomBar}>
      {/* Status pills: zoom + anonymous */}
      {(zoom > 0 || anonymousMode) && (
        <div className={styles.pillRow}>
          {zoom > 0 && (
            <button
              type="button"
              onClick={onCycleZoom}
              className={styles.zoomPill}
              aria-label={`Zoom level ${zoomLabel}, tap to cycle`}
            >
              <IonIcon name="search-outline" size={12} color="#3B82F6" />
              <span className={styles.zoomText}>{zoomLabel}</span>
            </button>
          )}
          {anonymousMode && (
            <div className={styles.anonPill}>
              <IonIcon name="eye-off" size={12} color="#F5A623" />
              <span className={styles.anonPillText}>Private</span>
            </div>
          )}
        </div>
      )}

      {/* Low-light suggestion pill */}
      {showLowLightHint && (
        <div className={styles.lowLightPill}>
          <IonIcon name="flashlight-outline" size={13} color="#FBBF24" />
          <span className={styles.lowLightText}>Low light — try the torch</span>
        </div>
      )}

      {/* Main control row: Gallery + Torch */}
      <div className={styles.controlRow}>
        {/* Gallery */}
        <div className={styles.btnGroup}>
          <button
            type="button"
            onClick={onPickImage}
            aria-label="Scan QR from gallery"
            className={styles.bottomGlassBtn}
          >
            <IonIcon name="images-outline" size={24} color="rgba(255,255,255,0.92)" />
          </button>
          <span className={styles.btnLabel}>Gallery</span>
        </div>

        {/* Torch */}
        <div className={styles.btnGroup}>
          <div className={styles.torchBtnWrap}>
            <button
              type="button"
              onClick={isFlashDisabled ? undefined : onToggleFlash}
              disabled={isFlashDisabled}
              aria-label={
                isFlashDisabled
                  ? "Torch unavailable on front camera"
                  : isFlashActive
                  ? "Turn off torch"
                  : "Turn on torch"
              }
              className={`${styles.bottomGlassBtn} ${
                isFlashActive ? styles.bottomGlassBtnFlash : ""
              } ${isFlashDisabled ? styles.bottomGlassBtnDisabled : ""} ${
                showLowLightHint ? styles.bottomGlassBtnLowLight : ""
              }`}
            >
              <IonIcon
                name={isFlashActive ? "flashlight" : "flashlight-outline"}
                size={24}
                color={
                  isFlashDisabled
                    ? "rgba(255,255,255,0.22)"
                    : isFlashActive
                    ? "#FFD60A"
                    : showLowLightHint
                    ? "#FBBF24"
                    : "rgba(255,255,255,0.92)"
                }
              />
            </button>

            {showLowLightHint && <span className={styles.torchGlowRing} aria-hidden="true" />}
          </div>
          <span className={`${styles.btnLabel} ${isFlashDisabled ? styles.btnLabelDim : ""}`}>
            Torch
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main ScannerView Component (Matches features/scanner/ScannerScreen.tsx) ──
export default function ScannerView() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingStreamRef = useRef<Promise<MediaStream | null> | null>(null);
  const frameRef = useRef<number | null>(null);
  const detectingRef = useRef(false);
  const mountedRef = useRef(true);

  // ── Permission & Hardware Lifecycle (mirrors ScannerScreen.tsx) ───────────
  // permission === null on initial render (matches SSR & client hydration deterministically)
  const [permission, setPermission] = useState<{
    granted: boolean;
    canAskAgain: boolean;
  } | null>(null);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [hardwareAvailable, setHardwareAvailable] = useState<boolean | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [cameraErrorType, setCameraErrorType] = useState<CameraErrorType>("unavailable");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPreviewReady, setCameraPreviewReady] = useState(false);

  const cameraAvailableRef = useRef(true);
  const cameraReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraActivateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraPreviewSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scanner Controls & State (mirrors useCameraControls.ts & useScanner.ts) ─
  const [user, setUser] = useState<any>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [facing] = useState<"back" | "front">("back");

  const manualZoomRef = useRef<number>(ZOOM_LEVELS[0].zoom);
  const zoomRef = useRef<number>(ZOOM_LEVELS[0].zoom);
  const [zoom, setZoomState] = useState<number>(ZOOM_LEVELS[0].zoom);
  const [zoomLabel, setZoomLabel] = useState<string>(ZOOM_LEVELS[0].label);
  const isSmartZoomedRef = useRef(false);
  const smartZoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanLockRef = useRef(false);
  const canScanRef = useRef(true);

  // ── Messages & Banners (mirrors useScanMessages.ts) ───────────────────────
  const [galleryErrorMsg, setGalleryErrorMsg] = useState<string | null>(null);
  const [scannerMsg, setScannerMsg] = useState<string | null>(null);
  const [scannerMsgType, setScannerMsgType] = useState<ToastType>("error");
  const [conversionBannerMsg, setConversionBannerMsg] = useState<string | null>(null);

  const showScannerMsg = useCallback((msg: string, type: ToastType = "error") => {
    setScannerMsg(msg);
    setScannerMsgType(type);
  }, []);
  const dismissScannerMsg = useCallback(() => setScannerMsg(null), []);
  const dismissGalleryError = useCallback(() => setGalleryErrorMsg(null), []);
  const dismissConversionBanner = useCallback(() => setConversionBannerMsg(null), []);

  // ── Tap-to-focus state ────────────────────────────────────────────────────
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const focusRingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Check logged-in user for Private Mode eye toggle ──────────────────────
  useEffect(() => {
    const supabase = getWebSupabase();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (mountedRef.current) {
        setUser(data.session?.user ?? null);
      }
    });
  }, []);

  // ── Hardware availability check (mirrors ScannerScreen.tsx lines 101-110) ─
  useEffect(() => {
    const hasMedia =
      typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
    setHardwareAvailable(hasMedia);
  }, []);

  useEffect(() => {
    cameraAvailableRef.current = cameraAvailable;
  }, [cameraAvailable]);

  // ── Zoom helpers (mirrors useCameraControls.ts) ───────────────────────────
  const applyZoomToStream = useCallback((zoomValue: number) => {
    const level = ZOOM_LEVELS.find((l) => l.zoom === zoomValue) ?? ZOOM_LEVELS[0];
    const stream = streamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    try {
      const caps = typeof (track as any).getCapabilities === "function" ? (track as any).getCapabilities() : null;
      if (caps?.zoom) {
        const minZ = caps.zoom.min ?? 1;
        const maxZ = caps.zoom.max ?? 3;
        const hwZoom = Math.min(maxZ, Math.max(minZ, level.scale));
        (track as any).applyConstraints({ advanced: [{ zoom: hwZoom }] }).catch(() => {});
      }
    } catch {}
  }, []);

  const setZoom = useCallback(
    (value: number) => {
      zoomRef.current = value;
      setZoomState(value);
      applyZoomToStream(value);
    },
    [applyZoomToStream]
  );

  const clearSmartZoomTimer = useCallback(() => {
    if (smartZoomTimerRef.current) {
      clearTimeout(smartZoomTimerRef.current);
      smartZoomTimerRef.current = null;
    }
  }, []);

  const cycleZoom = useCallback(() => {
    const currentIdx = ZOOM_LEVELS.findIndex((z) => z.zoom === manualZoomRef.current);
    const next = ZOOM_LEVELS[(currentIdx + 1) % ZOOM_LEVELS.length];
    clearSmartZoomTimer();
    isSmartZoomedRef.current = false;
    manualZoomRef.current = next.zoom;
    setZoom(next.zoom);
    setZoomLabel(next.label);
  }, [clearSmartZoomTimer, setZoom]);

  const onQRBoundsDetected = useCallback(
    (widthFraction: number | undefined) => {
      if (scanLockRef.current || !widthFraction) return;
      const base = manualZoomRef.current;
      let targetZoom = base;

      if (widthFraction < SMART_ZOOM_VERY_SMALL) {
        const level = ZOOM_LEVELS.find((l) => l.label === "2×");
        if (level) targetZoom = Math.max(base, level.zoom);
      } else if (widthFraction < SMART_ZOOM_SMALL) {
        const level = ZOOM_LEVELS.find((l) => l.label === "1.5×");
        if (level) targetZoom = Math.max(base, level.zoom);
      } else {
        if (isSmartZoomedRef.current) {
          isSmartZoomedRef.current = false;
          clearSmartZoomTimer();
          setZoom(base);
        }
        return;
      }

      if (targetZoom !== zoomRef.current) {
        isSmartZoomedRef.current = true;
        setZoom(targetZoom);
      }

      clearSmartZoomTimer();
      smartZoomTimerRef.current = setTimeout(() => {
        if (isSmartZoomedRef.current) {
          isSmartZoomedRef.current = false;
          setZoom(manualZoomRef.current);
        }
      }, SMART_ZOOM_RESET_MS);
    },
    [clearSmartZoomTimer, setZoom]
  );

  // ── Camera stop & start helpers ───────────────────────────────────────────
  const stopCamera = useCallback((resetTorch = true) => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    detectingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          (track as any).applyConstraints?.({ advanced: [{ torch: false }] }).catch(() => {});
        } catch {}
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (resetTorch) {
      setFlashOn(false);
    }
  }, []);

  const markCameraReady = useCallback(() => {
    if (cameraReadyTimerRef.current) {
      clearTimeout(cameraReadyTimerRef.current);
      cameraReadyTimerRef.current = null;
    }
    if (cameraPreviewSafetyRef.current) {
      clearTimeout(cameraPreviewSafetyRef.current);
      cameraPreviewSafetyRef.current = null;
    }
    setCameraPreviewReady(true);
  }, []);

  const markCameraUnavailable = useCallback(
    (type: CameraErrorType) => {
      if (cameraReadyTimerRef.current) {
        clearTimeout(cameraReadyTimerRef.current);
        cameraReadyTimerRef.current = null;
      }
      if (cameraPreviewSafetyRef.current) {
        clearTimeout(cameraPreviewSafetyRef.current);
        cameraPreviewSafetyRef.current = null;
      }
      cameraAvailableRef.current = false;
      setCameraErrorType(type);
      setCameraAvailable(false);
      stopCamera();
    },
    [stopCamera]
  );

  // ── Scan Processing (mirrors useScanProcessor.ts) ─────────────────────────
  const processScan = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();
      if (!content) {
        scanLockRef.current = false;
        canScanRef.current = true;
        setScanned(false);
        return;
      }

      setProcessing(true);

      if (!user || anonymousMode) {
        const slot = consumeWebAnonScanSlot();
        if (!slot.allowed) {
          setProcessing(false);
          showScannerMsg("You've reached 50 scans today. Sign up for unlimited scanning.", "info");
          setTimeout(() => {
            if (!mountedRef.current) return;
            setScanned(false);
            setScanSuccess(false);
            scanLockRef.current = false;
            canScanRef.current = true;
          }, 2500);
          return;
        }
        if (!user && ANON_CONVERSION_MILESTONES.has(slot.totalCount)) {
          setConversionBannerMsg(ANON_CONVERSION_MESSAGES[slot.totalCount] ?? null);
        }
      }

      const path = await getQrDetailsPath(content);
      if (!mountedRef.current) return;

      if (!path) {
        setProcessing(false);
        showScannerMsg("Invalid QR code content", "error");
        setTimeout(() => {
          if (!mountedRef.current) return;
          setScanned(false);
          setScanSuccess(false);
          scanLockRef.current = false;
          canScanRef.current = true;
        }, 2500);
        return;
      }

      setScanSuccess(true);
      stopCamera();
      router.push(path);
    },
    [user, anonymousMode, router, showScannerMsg, stopCamera]
  );

  // ── Acquire Camera Stream & Start Frame Decode Loop ───────────────────────
  const startCamera = useCallback(
    async (forceRestart = false, keepTorchState = false) => {
      if (forceRestart) {
        stopCamera(!keepTorchState);
      } else if (streamRef.current) {
        const hasLiveTrack = streamRef.current.getVideoTracks().some((t) => t.readyState === "live");
        if (hasLiveTrack) {
          setPermission({ granted: true, canAskAgain: true });
          setCameraActive(true);
          markCameraReady();
          setRequestingPermission(false);
          return;
        }
        stopCamera(!keepTorchState);
      }

      setRequestingPermission(true);

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (mountedRef.current) {
          setRequestingPermission(false);
          setPermission({ granted: false, canAskAgain: false });
          showScannerMsg("Camera access is not supported by your browser.", "error");
        }
        return;
      }

      const constraintSets: MediaStreamConstraints[] = [
        { audio: false, video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        { audio: false, video: { facingMode: "environment" } },
        { audio: false, video: { facingMode: "user" } },
        { audio: false, video: true },
      ];

      let lastError: any = null;

      const acquireStream = async (): Promise<MediaStream | null> => {
        for (const constraints of constraintSets) {
          try {
            const s = await navigator.mediaDevices.getUserMedia(constraints);
            if (s) return s;
          } catch (err: any) {
            lastError = err;
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
              break;
            }
          }
        }
        return null;
      };

      if (!pendingStreamRef.current) {
        pendingStreamRef.current = acquireStream().finally(() => {
          pendingStreamRef.current = null;
        });
      }

      const stream = await pendingStreamRef.current;

      if (!mountedRef.current) {
        if (stream && stream !== streamRef.current) {
          stream.getTracks().forEach((track) => track.stop());
        }
        return;
      }

      setRequestingPermission(false);

      if (!stream) {
        stopCamera();
        const errName = lastError?.name ?? "";
        if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
          clearRememberedCameraPermission();
          setPermission({ granted: false, canAskAgain: false });
          showScannerMsg("Camera permission was denied. Enable camera access in your browser settings.", "error");
        } else if (errName === "NotReadableError" || errName === "TrackStartError") {
          setPermission({ granted: true, canAskAgain: true });
          markCameraUnavailable("inuse");
        } else {
          setPermission({ granted: true, canAskAgain: true });
          markCameraUnavailable("unavailable");
        }
        return;
      }

      // Permission granted — persist and activate camera view
      rememberCameraPermission();
      streamRef.current = stream;
      cameraAvailableRef.current = true;
      setCameraAvailable(true);
      setPermission({ granted: true, canAskAgain: true });
      setCameraActive(true);

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.setAttribute("playsinline", "true");
        video.setAttribute("muted", "true");
        video.setAttribute("autoplay", "true");

        const onReady = () => {
          if (mountedRef.current) markCameraReady();
        };
        video.onloadeddata = onReady;
        video.onplaying = onReady;

        try {
          await video.play();
          markCameraReady();
        } catch {
          video.onloadedmetadata = async () => {
            try {
              await video.play();
              markCameraReady();
            } catch {}
          };
        }
      } else {
        markCameraReady();
      }

      if (!mountedRef.current) return;

      let detector: Detector | null = null;
      try {
        const DetectorApi = (window as BarcodeDetectorWindow).BarcodeDetector;
        if (DetectorApi) {
          detector = new DetectorApi({ formats: ["qr_code"] });
        }
      } catch {
        detector = null;
      }

      const scanFrame = async () => {
        if (!mountedRef.current || !videoRef.current || !streamRef.current) return;
        if (
          canScanRef.current &&
          !scanLockRef.current &&
          !detectingRef.current &&
          videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          detectingRef.current = true;
          try {
            let value: string | null | undefined = null;
            let widthFraction: number | undefined;

            if (detector) {
              try {
                const results = await detector.detect(videoRef.current);
                const match = results.find((result) => result.rawValue);
                if (match?.rawValue) {
                  value = match.rawValue.trim();
                  if (match.boundingBox?.width && videoRef.current.videoWidth > 0) {
                    widthFraction = match.boundingBox.width / videoRef.current.videoWidth;
                  }
                }
              } catch {
                // fallback to jsQR
              }
            }
            if (!value && canvasRef.current && videoRef.current) {
              const decoded = decodeVideoFrame(videoRef.current, canvasRef.current);
              if (decoded) {
                value = decoded.data;
                widthFraction = decoded.widthFraction;
              }
            }
            if (value) {
              onQRBoundsDetected(widthFraction);
              scanLockRef.current = true;
              canScanRef.current = false;
              setScanned(true);
              clearSmartZoomTimer();
              await processScan(value);
              return;
            }
          } catch {
            /* continue scan loop */
          } finally {
            detectingRef.current = false;
          }
        }
        frameRef.current = requestAnimationFrame(scanFrame);
      };

      frameRef.current = requestAnimationFrame(scanFrame);
    },
    [
      stopCamera,
      markCameraReady,
      markCameraUnavailable,
      showScannerMsg,
      onQRBoundsDetected,
      clearSmartZoomTimer,
      processScan,
    ]
  );

  // ── Initial mount: check permission, and if granted start camera after Android 300ms gate ─
  useEffect(() => {
    mountedRef.current = true;
    let permissionStatusObj: PermissionStatus | null = null;

    const init = async () => {
      const status = await detectBrowserCameraPermission();
      if (!mountedRef.current) return;
      setPermission(status);

      if (status.granted) {
        cameraActivateTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          setCameraPreviewReady(false);
          setCameraActive(true);
          void startCamera(false);
        }, 300);
      }

      if (typeof navigator !== "undefined" && navigator.permissions?.query) {
        try {
          permissionStatusObj = await navigator.permissions.query({ name: "camera" as PermissionName });
          permissionStatusObj.onchange = () => {
            if (!mountedRef.current || !permissionStatusObj) return;
            if (permissionStatusObj.state === "granted") {
              rememberCameraPermission();
              setPermission({ granted: true, canAskAgain: true });
              void startCamera(false);
            } else if (permissionStatusObj.state === "denied") {
              clearRememberedCameraPermission();
              stopCamera();
              setCameraActive(false);
              setCameraPreviewReady(false);
              setPermission({ granted: false, canAskAgain: false });
            }
          };
        } catch {}
      }
    };

    void init();

    return () => {
      mountedRef.current = false;
      if (permissionStatusObj) {
        permissionStatusObj.onchange = null;
      }
      if (cameraActivateTimerRef.current) clearTimeout(cameraActivateTimerRef.current);
      if (cameraReadyTimerRef.current) clearTimeout(cameraReadyTimerRef.current);
      if (cameraPreviewSafetyRef.current) clearTimeout(cameraPreviewSafetyRef.current);
      if (focusRingTimerRef.current) clearTimeout(focusRingTimerRef.current);
      clearSmartZoomTimer();
      stopCamera();
    };
  }, [startCamera, stopCamera, clearSmartZoomTimer]);

  // ── Safety net: lift the black cover after 5000ms if onCameraReady hasn't fired ─
  useEffect(() => {
    if (cameraPreviewSafetyRef.current) {
      clearTimeout(cameraPreviewSafetyRef.current);
      cameraPreviewSafetyRef.current = null;
    }
    if (cameraActive && !cameraPreviewReady) {
      cameraPreviewSafetyRef.current = setTimeout(() => {
        if (!cameraAvailableRef.current) return;
        setCameraPreviewReady(true);
      }, 5000);
    }
    return () => {
      if (cameraPreviewSafetyRef.current) {
        clearTimeout(cameraPreviewSafetyRef.current);
        cameraPreviewSafetyRef.current = null;
      }
    };
  }, [cameraActive, cameraPreviewReady]);

  // ── CameraLive computed state (mirrors ScannerScreen.tsx line 239) ────────
  const cameraLive =
    cameraActive && hardwareAvailable !== null && cameraAvailable && cameraPreviewReady;

  // ── Low-light detection (mirrors useLowLightDetection.ts) ─────────────────
  const [lowLightSuggested, setLowLightSuggested] = useState(false);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastShownAtRef = useRef(0);

  useEffect(() => {
    const clearLowLightTimers = () => {
      if (suggestTimerRef.current) {
        clearTimeout(suggestTimerRef.current);
        suggestTimerRef.current = null;
      }
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };

    if (!cameraLive || flashOn || scanned || facing !== "back") {
      setLowLightSuggested(false);
      clearLowLightTimers();
      return;
    }

    const now = Date.now();
    if (lastShownAtRef.current > 0 && now - lastShownAtRef.current < COOLDOWN_MS) {
      return;
    }

    clearLowLightTimers();
    suggestTimerRef.current = setTimeout(() => {
      suggestTimerRef.current = null;
      lastShownAtRef.current = Date.now();
      setLowLightSuggested(true);

      dismissTimerRef.current = setTimeout(() => {
        dismissTimerRef.current = null;
        setLowLightSuggested(false);
      }, AUTO_DISMISS_MS);
    }, SUGGEST_DELAY_MS);

    return clearLowLightTimers;
  }, [cameraLive, scanned, flashOn, facing]);

  // ── Torch toggle (hardware constraint + Android turn-off fix + brightness fallback) ─
  const applyTorchToTrack = useCallback(async (track: MediaStreamTrack, enable: boolean): Promise<boolean> => {
    try {
      await (track as any).applyConstraints({
        advanced: [{ torch: enable }],
      });
      return true;
    } catch {
      try {
        await (track as any).applyConstraints({
          torch: enable,
          fillLightMode: enable ? "flash" : "off",
        } as any);
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  const toggleFlash = useCallback(async () => {
    const nextState = !flashOn;
    setFlashOn(nextState);

    const stream = streamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const applied = await applyTorchToTrack(track, nextState);

    if (!nextState && applied) {
      try {
        const settings = typeof (track as any).getSettings === "function" ? (track as any).getSettings() : null;
        if (settings && settings.torch === true) {
          await startCamera(true, false);
        }
      } catch {}
    }
  }, [flashOn, applyTorchToTrack, startCamera]);

  // ── Retry camera handler (mirrors ScannerScreen.tsx line 184) ─────────────
  const handleCameraRetry = useCallback(() => {
    setCameraPreviewReady(false);
    cameraAvailableRef.current = true;
    setCameraAvailable(true);
    setCameraErrorType("unavailable");
    void startCamera(true);
  }, [startCamera]);

  // ── Tap-to-focus handler (mirrors ScannerScreen.tsx line 259) ─────────────
  const handleTapFocus = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cameraLive || scanned) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (focusRingTimerRef.current) clearTimeout(focusRingTimerRef.current);
      setFocusPoint({ x, y });

      focusRingTimerRef.current = setTimeout(() => {
        setFocusPoint(null);
      }, 1140);
    },
    [cameraLive, scanned]
  );

  // ── Gallery image decoder (mirrors useScanProcessor.ts handlePickImage) ───
  const handlePickImage = useCallback(() => {
    if (scanLockRef.current) return;
    fileInputRef.current?.click();
  }, []);

  const handleImageFile = useCallback(
    (file: File) => {
      if (!file) return;
      if (scanLockRef.current) return;
      scanLockRef.current = true;
      canScanRef.current = false;

      const releaseLock = () => {
        scanLockRef.current = false;
        canScanRef.current = true;
      };

      setProcessing(true);

      const reader = new FileReader();
      reader.onerror = () => {
        setProcessing(false);
        setGalleryErrorMsg("Could not open your gallery. Please try again.");
        releaseLock();
      };
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => {
          setProcessing(false);
          setGalleryErrorMsg("Something went wrong. Please try again.");
          releaseLock();
        };
        img.onload = async () => {
          try {
            const canvas = canvasRef.current ?? document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) {
              setProcessing(false);
              releaseLock();
              return;
            }
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: "attemptBoth",
            });
            if (!code || !code.data) {
              setGalleryErrorMsg("No QR code found in this image — try a clearer or closer photo.");
              setProcessing(false);
              releaseLock();
              return;
            }
            await processScan(code.data);
          } catch (e: any) {
            setProcessing(false);
            setGalleryErrorMsg(e?.message || "Something went wrong. Please try again.");
            releaseLock();
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    },
    [processScan]
  );

  const zoomScale = (ZOOM_LEVELS.find((l) => l.zoom === zoom) ?? ZOOM_LEVELS[0]).scale;

  // ── 1. Permission not yet resolved (ScannerScreen.tsx line 291) ───────────
  if (!permission) {
    return (
      <section className={styles.scannerRootBlack} aria-label="QR Scanner">
        <video ref={videoRef} className={styles.hiddenVideo} playsInline muted />
        <canvas ref={canvasRef} className={styles.decoderCanvas} aria-hidden="true" />
      </section>
    );
  }

  // ── 2. Permission not granted (ScannerScreen.tsx line 295) ────────────────
  if (!permission.granted) {
    return (
      <section className={styles.permissionRoot} aria-labelledby="permission-title">
        <video ref={videoRef} className={styles.hiddenVideo} playsInline muted />
        <canvas ref={canvasRef} className={styles.decoderCanvas} aria-hidden="true" />

        <PermissionScreen
          canAskAgain={permission.canAskAgain}
          loading={requestingPermission}
          onRequestPermission={() => void startCamera(true)}
          onShowSettingsHint={() =>
            showScannerMsg(
              "Allow camera access in your browser's site settings (lock icon in the address bar), then tap Enable Camera.",
              "info"
            )
          }
        />

        {scannerMsg && (
          <div className={styles.toastContainer} style={{ bottom: 32 }}>
            <ScannerToast
              message={scannerMsg}
              type={scannerMsgType}
              onDone={dismissScannerMsg}
            />
          </div>
        )}
      </section>
    );
  }

  // ── 3. Active Scanner View (ScannerScreen.tsx line 312) ───────────────────
  return (
    <section className={styles.scannerRootBlack} aria-label="QR Scanner">
      {/* Hidden file input for gallery upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-label="Upload QR code image"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
          e.target.value = "";
        }}
      />

      <canvas ref={canvasRef} className={styles.decoderCanvas} aria-hidden="true" />

      {/* Black placeholder holds space during all non-camera states */}
      <div className={styles.blackPlaceholder} />

      {hardwareAvailable === null ? null : !cameraAvailable ? (
        /* Camera Unavailable / In Use Screen (ScannerScreen.tsx line 321) */
        <div className={styles.unavailableOverlay}>
          <div className={styles.unavailableTopBar}>
            <Link href="/" className={styles.unavailableBackBtn} aria-label="Go back">
              <IonIcon name="chevron-back" size={22} color="#fff" />
            </Link>
          </div>
          <div className={styles.unavailableCenter}>
            <CameraUnavailableBanner
              onPickImage={handlePickImage}
              onRetry={handleCameraRetry}
              errorType={cameraErrorType}
            />
          </div>
        </div>
      ) : (
        /* Live Camera Stage + Black Shield until onCameraReady fires */
        <div className={styles.cameraStage}>
          <video
            ref={videoRef}
            className={`${styles.cameraVideo} ${
              flashOn && facing === "back" ? styles.cameraVideoTorch : ""
            }`}
            style={zoomScale > 1 ? { transform: `scale(${zoomScale})` } : undefined}
            playsInline
            muted
            aria-label="QR camera preview"
          />

          {/* Black shield — removed once onCameraReady fires (ScannerScreen.tsx line 364) */}
          {!cameraPreviewReady && <div className={styles.blackShield} />}
        </div>
      )}

      {/* Tap-to-focus area — sits between camera and overlay */}
      {cameraLive && !scanned && (
        <div
          className={styles.tapFocusArea}
          onClick={handleTapFocus}
          aria-hidden="true"
        />
      )}

      {/* Tap-to-focus ring indicator */}
      {focusPoint && (
        <div
          className={styles.focusRing}
          style={{
            left: focusPoint.x - 28,
            top: focusPoint.y - 28,
          }}
        />
      )}

      {/* Scanner overlay (controls, finder, animations) */}
      {cameraLive && (
        <div className={styles.scannerOverlay}>
          {/* Top bar — back btn | BinRo | eye icon */}
          <OverlayTopBar
            anonymousMode={anonymousMode}
            onToggleAnonymous={() => setAnonymousMode((prev) => !prev)}
            user={user}
          />

          {/* Non-interactive center layer: title + FinderFrame + status */}
          <div className={styles.overlayCenterNonInteractive}>
            <div className={styles.titleArea}>
              <h1 id="scanner-title" className={styles.titleText}>
                Scan a QR code
              </h1>
            </div>

            <FinderFrame />

            {scanned && (
              <div className={styles.hintArea}>
                <p className={styles.hintText}>
                  {scanSuccess ? "Code captured" : "Analyzing…"}
                </p>
              </div>
            )}
          </div>

          {/* Bottom controls — Gallery + Torch */}
          <OverlayBottomBar
            zoom={zoom}
            zoomLabel={zoomLabel}
            onCycleZoom={cycleZoom}
            anonymousMode={anonymousMode}
            onPickImage={handlePickImage}
            flashOn={flashOn}
            onToggleFlash={() => void toggleFlash()}
            facing={facing}
            lowLightSuggested={lowLightSuggested}
          />
        </div>
      )}

      {/* Processing overlay (Reading QR Code / Preparing the QR details…) */}
      {processing && <ProcessingOverlay />}

      {/* Anonymous scan milestone conversion banner */}
      <ConversionBanner
        message={conversionBannerMsg}
        visible={!user && !!conversionBannerMsg}
        onSignIn={() => {
          dismissConversionBanner();
          router.push("/login");
        }}
        onDismiss={dismissConversionBanner}
      />

      {/* Gallery error toast */}
      {galleryErrorMsg && (
        <div
          className={styles.toastContainer}
          style={{ bottom: conversionBannerMsg ? 120 : 40 }}
        >
          <ScannerToast
            message={galleryErrorMsg}
            type="error"
            onDone={dismissGalleryError}
          />
        </div>
      )}

      {/* General scanner toast */}
      {scannerMsg && !galleryErrorMsg && (
        <div className={styles.toastContainer} style={{ bottom: 40 }}>
          <ScannerToast
            message={scannerMsg}
            type={scannerMsgType}
            onDone={dismissScannerMsg}
          />
        </div>
      )}
    </section>
  );
}

