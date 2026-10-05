/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO SHARED: CANONICAL QR DETAILS & TRUST SCORE RULES
 * ───────────────────────────────────────────────────────────────────────────────
 * The single source of truth shared between mobile (React Native / Expo)
 * and web (Next.js):
 *  1. Trust score calculations, tiers, labels, badge details, colors, and gradients.
 *  2. Community vote & rating categories (Safe, Scam, Fake, Spam) & breakdown stats.
 *  3. Content type normalization, payment detection, and amount formatting.
 *  4. Comment threading, hierarchy (descendants, roots, optimistic merges).
 *  5. User profile resolution and comment author enrichment.
 *  6. Pagination and UI threshold constants.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { AppColors } from "../constants/colors";
import {
  calculateTrustScore as calculateTrustScoreEngine,
  type TrustScore,
} from "../../services/trust/trust-service";
import { detectContentType } from "./qr-content";
import { formatCompactNumber, formatRelativeTime as formatRelTime } from "./formatters";
import { isPaymentQr, parseAnyPaymentQr } from "../../services/analysis";

export type { TrustScore };

export const COMMENTS_PER_PAGE = 20;
export const REPLIES_PER_PAGE = 10;
export const READ_MORE_THRESHOLD = 200;

export type ReportKey = "safe" | "scam" | "fake" | "spam";

export interface ReportTypeConfig {
  key: ReportKey;
  label: string;
  icon: string;
  outlineIcon: string;
  color: (c: AppColors) => string;
  bg: (c: AppColors) => string;
}

export interface ResolvedReportType {
  key: ReportKey;
  label: string;
  icon: string;
  outlineIcon: string;
  color: string;
  bg: string;
  borderColor: string;
}

export const REPORT_TYPES: ReportTypeConfig[] = [
  {
    key: "safe",
    label: "Safe",
    icon: "shield-checkmark",
    outlineIcon: "shield-checkmark-outline",
    color: (c) => c.safe,
    bg: (c) => c.safeDim,
  },
  {
    key: "scam",
    label: "Scam",
    icon: "warning",
    outlineIcon: "warning-outline",
    color: (c) => c.danger,
    bg: (c) => c.dangerDim,
  },
  {
    key: "fake",
    label: "Fake",
    icon: "close-circle",
    outlineIcon: "close-circle-outline",
    color: (c) => c.warning,
    bg: (c) => c.warningDim,
  },
  {
    key: "spam",
    label: "Spam",
    icon: "mail-unread",
    outlineIcon: "mail-unread-outline",
    color: (c) => c.primary,
    bg: (c) => c.primaryDim,
  },
];

export const RATE_TYPES: ReportTypeConfig[] = REPORT_TYPES.filter(
  (r) => r.key !== "fake"
);

export const REPORT_LABELS: Record<string, string> = {
  safe: "Safe",
  scam: "Scam",
  fake: "Fake",
  spam: "Spam",
};

export const REPORT_ICONS: Record<string, string> = {
  safe: "shield-checkmark",
  scam: "warning",
  fake: "close-circle",
  spam: "mail-unread",
};

export function getResolvedReportTypes(colors: AppColors): ResolvedReportType[] {
  return REPORT_TYPES.map((rt) => {
    const resolvedColor = rt.color(colors);
    const resolvedBg = rt.bg(colors);
    return {
      key: rt.key,
      label: rt.label,
      icon: rt.icon,
      outlineIcon: rt.outlineIcon,
      color: resolvedColor,
      bg: resolvedBg,
      borderColor: `${resolvedColor}50`,
    };
  });
}

export function getResolvedRateTypes(colors: AppColors): ResolvedReportType[] {
  return RATE_TYPES.map((rt) => {
    const resolvedColor = rt.color(colors);
    const resolvedBg = rt.bg(colors);
    return {
      key: rt.key,
      label: rt.label,
      icon: rt.icon,
      outlineIcon: rt.outlineIcon,
      color: resolvedColor,
      bg: resolvedBg,
      borderColor: `${resolvedColor}50`,
    };
  });
}

export function getContentTypeColor(type: string, colors: AppColors): string {
  if (type === "safe") return colors.safe;
  if (type === "warning") return colors.warning;
  if (type === "danger") return colors.danger;
  return colors.primary;
}

// ── Trust score rules & classifications ──────────────────────────────────────

export function calculateTrustScore(
  reportCounts: Record<string, number>,
  weightedCounts?: Record<string, number>,
  collusionFlags?: {
    suspicious: boolean;
    safeWeightMultiplier?: number;
    negativeWeightMultiplier?: number;
  }
): TrustScore {
  return calculateTrustScoreEngine(reportCounts, weightedCounts, collusionFlags);
}

export function calculateFallbackTrustScore(reportCounts: Record<string, number>): {
  score: number;
  label: string;
} {
  const total = Object.values(reportCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return { score: -1, label: "Unrated" };
  const safe = (reportCounts["safe"] ?? 0) + (reportCounts["likely_safe"] ?? 0);
  const score = Math.round((safe / total) * 100);
  const label =
    score >= 75
      ? "Trusted"
      : score >= 55
        ? "Likely Safe"
        : score >= 40
          ? "Uncertain"
          : score >= 25
            ? "Suspicious"
            : "Dangerous";
  return { score, label };
}

export function getTrustColor(label: string, colors: AppColors): string {
  switch (label) {
    case "Trusted":
    case "Likely Safe":
      return colors.safe;
    case "Caution":
    case "Uncertain":
      return colors.warning;
    case "Dangerous":
    case "Suspicious":
      return colors.danger;
    default:
      return colors.textMuted;
  }
}

export function getScoreGradient(score: number, colors: AppColors): [string, string] {
  if (score >= 70) return [colors.safe, colors.safeShade];
  if (score >= 40) return [colors.warning, colors.warningShade];
  if (score >= 0) return [colors.danger, colors.dangerShade];
  return [colors.textMuted, colors.surfaceBorder];
}

export function getScoreLabel(score: number): string {
  if (score < 0) return "Unrated";
  if (score >= 75) return "Trusted";
  if (score >= 55) return "Likely Safe";
  if (score >= 40) return "Uncertain";
  if (score >= 25) return "Suspicious";
  return "Dangerous";
}

export type TrustTier = "safe" | "caution" | "danger" | "unrated";

export function getTrustTier(score: number): TrustTier {
  if (score < 0) return "unrated";
  if (score >= 55) return "safe";
  if (score >= 40) return "caution";
  return "danger";
}

export interface TrustBadgeDetails {
  score: number;
  label: string;
  tier: TrustTier;
  color: string;
  bg: string;
  borderColor: string;
  icon: string;
  gradient: [string, string];
  isTrusted: boolean;
  isDangerous: boolean;
}

export function getTrustBadgeDetails(
  score: number,
  labelOverride?: string,
  colors?: AppColors
): TrustBadgeDetails {
  const label = labelOverride || getScoreLabel(score);
  const tier = getTrustTier(score);

  const fallbackColors = {
    safe: "#059669",
    safeShade: "#065F46",
    safeDim: "rgba(5, 150, 105, 0.09)",
    warning: "#D97706",
    warningShade: "#B45309",
    warningDim: "rgba(217, 119, 6, 0.09)",
    danger: "#DC2626",
    dangerShade: "#991B1B",
    dangerDim: "rgba(220, 38, 38, 0.09)",
    textMuted: "#7A99BC",
    surfaceBorder: "#D4E0F5",
  };

  const c = colors || (fallbackColors as any);

  if (score < 0) {
    return {
      score: -1,
      label: "Unrated",
      tier: "unrated",
      color: c.textMuted,
      bg: `${c.textMuted}14`,
      borderColor: `${c.textMuted}30`,
      icon: "help-outline",
      gradient: [c.textMuted, c.surfaceBorder],
      isTrusted: false,
      isDangerous: false,
    };
  }

  const gradient = getScoreGradient(score, c);
  let color = c.safe;
  let bg = c.safeDim;
  let icon = "shield-checkmark";
  let isTrusted = false;
  let isDangerous = false;

  if (score >= 75) {
    color = c.safe;
    bg = c.safeDim;
    icon = "shield-checkmark";
    isTrusted = true;
  } else if (score >= 55) {
    color = c.safe;
    bg = c.safeDim;
    icon = "checkmark-circle";
    isTrusted = true;
  } else if (score >= 40) {
    color = c.warning;
    bg = c.warningDim;
    icon = "alert-circle";
  } else if (score >= 25) {
    color = c.danger;
    bg = c.dangerDim;
    icon = "warning";
    isDangerous = true;
  } else {
    color = c.danger;
    bg = c.dangerDim;
    icon = "close-circle";
    isDangerous = true;
  }

  return {
    score,
    label,
    tier,
    color,
    bg,
    borderColor: `${color}35`,
    icon,
    gradient,
    isTrusted,
    isDangerous,
  };
}

export interface VotedReportBreakdownItem {
  key: ReportKey;
  label: string;
  count: number;
  pct: number;
  color: string;
  bg: string;
  icon: string;
}

export function getVotedReportBreakdown(
  reportCounts: Record<string, number>,
  total: number,
  colors: AppColors
): VotedReportBreakdownItem[] {
  const resolved = getResolvedReportTypes(colors);
  if (total <= 0) return [];
  return resolved
    .map((rt) => {
      const count = reportCounts[rt.key] || 0;
      const pct = Math.round((count / total) * 100);
      return {
        key: rt.key,
        label: rt.label,
        count,
        pct,
        color: rt.color,
        bg: rt.bg,
        icon: rt.icon,
      };
    })
    .filter((item) => item.count > 0);
}

// ── Content type normalization & payment inspection rules ────────────────────

export type QrDetailContentType = "url" | "text" | "payment" | "phone" | "email" | "sms" | "wifi";

export function normalizeQrDetailContentType(
  contentType?: string | null,
  rawContent?: string
): QrDetailContentType {
  const lower = contentType?.toLowerCase()?.trim() || "";
  const content = rawContent?.trim() || "";

  if (
    lower === "payment" ||
    lower === "upi" ||
    lower === "paypal" ||
    lower === "gpay" ||
    lower === "phonepe" ||
    lower === "paytm" ||
    lower === "crypto" ||
    lower === "pix" ||
    lower === "sepa" ||
    lower === "paymentlink" ||
    (content.length > 0 && isPaymentQr(content))
  ) {
    return "payment";
  }

  if (
    lower === "phone" ||
    lower === "tel" ||
    (content.length > 0 && (/^tel:/i.test(content) || /^\+?[\d\s\-().]{7,20}$/.test(content)))
  ) {
    return "phone";
  }

  if (
    lower === "email" ||
    lower === "mailto" ||
    (content.length > 0 && /^mailto:/i.test(content))
  ) {
    return "email";
  }

  if (
    lower === "sms" ||
    (content.length > 0 && /^smsto?:/i.test(content))
  ) {
    return "sms";
  }

  if (
    lower === "wifi" ||
    (content.length > 0 && /^wifi:/i.test(content))
  ) {
    return "wifi";
  }

  if (
    lower === "url" ||
    (content.length > 0 &&
      (/^https?:\/\//i.test(content) ||
        (/^[a-z0-9-]+(\.[a-z0-9-]+)+\/?/i.test(content) && !content.includes(" "))))
  ) {
    return "url";
  }

  return "text";
}

export function detectDetailContentType(
  content: string,
  rawType?: string | null
): QrDetailContentType {
  return normalizeQrDetailContentType(rawType || detectContentType(content), content);
}

export function formatPaymentAmount(
  amount?: string | number | null,
  currency?: string | null,
  appCategory?: string | null
): string {
  if (amount === undefined || amount === null || amount === "") return "";
  const amt = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (isNaN(amt)) return String(amount);

  if (appCategory === "upi_india" || appCategory === "india_wallet") {
    return `₹${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  }
  if (appCategory === "pix") {
    return `R$ ${amt.toFixed(2)}`;
  }
  if (currency) {
    return `${currency} ${amt.toLocaleString()}`;
  }
  return amt.toLocaleString();
}

// ── Avatar & author profile resolution rules ──────────────────────────────────

export function isUserUploadedPhoto(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;
  if (
    trimmed.includes("googleusercontent.com") ||
    trimmed.includes("google.com") ||
    trimmed.includes("gstatic.com")
  ) {
    return false;
  }
  if (
    trimmed.includes("placeholder") ||
    trimmed.includes("default-avatar") ||
    trimmed.includes("ui-avatars.com")
  ) {
    return false;
  }
  return true;
}

export function getInitialColor(name: string): [string, string] {
  const palettes: [string, string][] = [
    ["#7C3AED", "#A78BFA"],
    ["#059669", "#34D399"],
    ["#E11D48", "#FB7185"],
    ["#D97706", "#FBBF24"],
    ["#475569", "#94A3B8"],
    ["#0D9488", "#2DD4BF"],
  ];
  const code = (name || "U").charCodeAt(0) || 0;
  return palettes[code % palettes.length];
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "just now";
  return formatRelTime(iso);
}

export function enrichCommentAuthor<
  T extends {
    userId?: string;
    userName?: string;
    userUsername?: string;
    userPhotoURL?: string;
    user?: { displayName?: string };
  }
>(
  comment: T,
  profile?: {
    displayName?: string;
    username?: string;
    photoURL?: string | null;
  }
): T {
  if (!profile) return comment;
  const updatedDisplayName =
    profile.displayName || comment.user?.displayName || comment.userName || "User";
  const updatedUsername = (
    profile.username ||
    comment.userUsername ||
    updatedDisplayName
  ).replace(/^@/, "");
  const updatedPhoto = profile.photoURL || comment.userPhotoURL;

  return {
    ...comment,
    userName: updatedDisplayName,
    userUsername: updatedUsername,
    userPhotoURL: updatedPhoto,
    user: comment.user
      ? { ...comment.user, displayName: updatedDisplayName }
      : { displayName: updatedDisplayName },
  };
}

// ── Comment hierarchy and tree traversal rules ───────────────────────────────

export function getRootCommentId<T extends { id: string; parentId?: string | null }>(
  commentsList: T[],
  commentId: string
): string {
  const byId = new Map(commentsList.map((c) => [c.id, c]));
  let curr = byId.get(commentId);
  let guard = 0;
  while (curr?.parentId && byId.has(curr.parentId) && guard < 20) {
    curr = byId.get(curr.parentId);
    guard++;
  }
  return curr?.id ?? commentId;
}

export function getAllDescendants<
  T extends { id: string; parentId?: string | null; createdAt?: string | null }
>(commentsList: T[], rootId: string): T[] {
  const childrenMap = new Map<string, T[]>();
  for (const c of commentsList) {
    if (!c.parentId) continue;
    const list = childrenMap.get(c.parentId) ?? [];
    list.push(c);
    childrenMap.set(c.parentId, list);
  }
  const result: T[] = [];
  const queue = [...(childrenMap.get(rootId) ?? [])];
  while (queue.length > 0) {
    const item = queue.shift()!;
    result.push(item);
    const kids = childrenMap.get(item.id);
    if (kids) queue.push(...kids);
  }
  result.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
  return result;
}

export function mergeWithOptimisticComments<
  T extends { id: string; userId?: string; text: string; parentId?: string | null }
>(
  liveComments: T[],
  pending: T[],
  deletingIds: Set<string>
): T[] {
  const filteredLive = liveComments.filter((c) => !deletingIds.has(c.id));
  const confirmedPending = pending.filter(
    (p) =>
      !filteredLive.some(
        (live) =>
          live.userId === p.userId &&
          live.text === p.text &&
          (live.parentId ?? null) === (p.parentId ?? null)
      )
  );
  return [...confirmedPending, ...filteredLive];
}
