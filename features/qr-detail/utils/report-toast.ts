/**
 * Shared constants for report-vote toast feedback used across all QR detail screens.
 * Centralised here to avoid duplication in Guard, Standard, and Static screens.
 */
import type { Ionicons } from "@expo/vector-icons";

export const REPORT_LABELS: Record<string, string> = {
  safe: "Safe",
  scam: "Scam",
  fake: "Fake",
  spam: "Spam",
};

export const REPORT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  safe: "shield-checkmark",
  scam: "warning",
  fake: "close-circle",
  spam: "mail-unread",
};
