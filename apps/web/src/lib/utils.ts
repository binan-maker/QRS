/**
 * General utility functions for @binro/web.
 * Framework-agnostic — no React or Next.js imports.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ─── Tailwind class merging ────────────────────────────────────────────────────

/**
 * Merge Tailwind CSS classes with conflict resolution.
 *
 * @example
 * cn("px-4 py-2", condition && "bg-blue-500", "px-6") // "py-2 bg-blue-500 px-6"
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/** Format a number with locale-aware short notation: 1234 → "1.2K". */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Format an ISO date string for display: "2026-07-17T10:00:00Z" → "Jul 17, 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/** Format relative time: "2 hours ago", "just now". */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

/** Format paise to rupee string: 10000 → "₹100.00". */
export function formatRupees(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);
}

// ─── QR utilities ─────────────────────────────────────────────────────────────

/** Map content type to a human-readable label. */
export function contentTypeLabel(contentType: string): string {
  const map: Record<string, string> = {
    url:     "Website",
    upi:     "UPI Payment",
    text:    "Plain Text",
    wifi:    "Wi-Fi",
    email:   "Email",
    phone:   "Phone",
    sms:     "SMS",
    vcard:   "Contact",
    location:"Location",
    event:   "Event",
  };
  return map[contentType] ?? contentType;
}

/** Map a unified QR status to a display label. */
export function qrStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active:       "Active",
    inactive:     "Paused",
    expired:      "Expired",
    limit_reached:"Limit Reached",
  };
  return map[status] ?? status;
}

// ─── URL / safety ─────────────────────────────────────────────────────────────

/** Return true if the URL uses a safe protocol (http/https/mailto/tel). */
export function isSafeUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return ["http:", "https:", "mailto:", "tel:"].includes(protocol);
  } catch {
    return false;
  }
}

/** Truncate a URL for display: "https://very-long-domain.com/path/..." */
export function truncateUrl(url: string, maxLen = 50): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 1) + "…";
}

// ─── String utilities ─────────────────────────────────────────────────────────

/** Capitalise the first letter of a string. */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Generate initials from a display name: "Ravi Kumar" → "RK". */
export function initials(name: string | null | undefined, fallback = "?"): string {
  if (!name) return fallback;
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
