// ── Settings ──────────────────────────────────────────────────────────────────

export type AppTheme = "light" | "dark" | "system";

export type AppLanguage = "en" | "hi" | "ml" | "ta" | "te";

export interface UserSettings {
  theme: AppTheme;
  language: AppLanguage;
  notificationsEnabled: boolean;
  analyticsOptIn: boolean;
  privacyMode: boolean;
  /** Whether haptic feedback is enabled on interactions. */
  hapticsEnabled: boolean;
}

// DEFAULT_SETTINGS lives in constants/business.ts — imported from "@binro/core".
