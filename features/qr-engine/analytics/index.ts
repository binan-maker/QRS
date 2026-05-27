/**
 * QR Engine — Analytics Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilities for building scan events, summarising analytics data, and
 * formatting analytics values for display.
 *
 * Usage:
 *   import { buildScanEvent, formatScanCount } from "@/features/qr-engine";
 */

import type { QrScanEvent, QrAnalyticsSummary } from "../types";

// ─── Scan event builder ───────────────────────────────────────────────────────
export function buildScanEvent(
  qr_id: string,
  options: Partial<Omit<QrScanEvent, "qr_id" | "scanned_at">> = {}
): QrScanEvent {
  return {
    qr_id,
    scanned_at: Date.now(),
    platform: "android",
    ...options,
  };
}

// ─── Display helpers ──────────────────────────────────────────────────────────
export function formatScanCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function formatLastScanned(timestamp: number | undefined): string {
  if (!timestamp) return "Never scanned";
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─── Empty analytics summary ──────────────────────────────────────────────────
export function emptyAnalytics(): QrAnalyticsSummary {
  return {
    scan_count: 0,
    unique_scanners: 0,
    last_scanned_at: undefined,
    trust_interactions: 0,
  };
}

// ─── Growth indicators ────────────────────────────────────────────────────────
export type GrowthTrend = "up" | "down" | "flat";

export function scanGrowthTrend(
  recentCount: number,
  previousCount: number
): GrowthTrend {
  if (recentCount > previousCount * 1.05) return "up";
  if (recentCount < previousCount * 0.95) return "down";
  return "flat";
}

export function trendIcon(trend: GrowthTrend): string {
  switch (trend) {
    case "up":   return "trending-up-outline";
    case "down": return "trending-down-outline";
    case "flat": return "remove-outline";
  }
}

export function trendColor(trend: GrowthTrend): string {
  switch (trend) {
    case "up":   return "#10B981";
    case "down": return "#EF4444";
    case "flat": return "#6B7280";
  }
}
